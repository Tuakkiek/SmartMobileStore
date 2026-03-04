import { normalizeUserAccess } from "./userAccessResolver.js";
import {
  buildPermissionGrantMap,
  buildPermissionSet,
  buildRolePermissionGrants,
  evaluatePolicy,
} from "./policyEngine.js";
import {
  collectBranchScopeIdsFromGrants,
  loadActiveUserPermissionGrants,
} from "./userPermissionService.js";
import { getOrLoadEffectiveContext } from "./effectivePermissionCache.js";

const normalizeScopeType = (value) => String(value || "").trim().toUpperCase();
const normalizeScopeId = (value) => String(value || "").trim();
const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();

const toUniqueStrings = (items = []) =>
  Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));

const dedupePermissionGrants = (grants = []) => {
  const byKey = new Map();
  for (const grant of grants) {
    const key = normalizePermissionKey(grant?.key);
    if (!key) continue;
    const scopeType = normalizeScopeType(grant?.scopeType || "GLOBAL");
    const scopeId = normalizeScopeId(grant?.scopeId);
    const dedupeKey = `${key}|${scopeType}|${scopeId}`;
    byKey.set(dedupeKey, {
      ...grant,
      key,
      scopeType,
      scopeId,
    });
  }
  return Array.from(byKey.values());
};

const selectBaseGrants = ({
  explicitGrants = [],
  roleGrants = [],
  preferredPermissionMode = "ROLE_FALLBACK",
}) => {
  const hasExplicit = explicitGrants.length > 0;
  const explicitRequested = String(preferredPermissionMode || "").trim().toUpperCase() === "EXPLICIT";

  if (!hasExplicit && !explicitRequested) {
    return {
      permissionMode: "ROLE_FALLBACK",
      grants: roleGrants,
    };
  }

  // Keep system-level role grants (GLOBAL_ADMIN wildcard) while explicit grants
  // are active, but drop branch/task role grants to avoid role hard-limits.
  const systemRoleGrants = roleGrants.filter((grant) => grant?.sourceType === "SYSTEM");
  return {
    permissionMode: "EXPLICIT",
    grants: [...explicitGrants, ...systemRoleGrants],
  };
};

export const resolveEffectiveAccessContext = async ({
  user,
  normalizedAccess = null,
  activeBranchId = "",
} = {}) => {
  const normalized = normalizedAccess || normalizeUserAccess(user);
  const effectiveActiveBranchId = normalizeScopeId(activeBranchId || normalized.defaultBranchId);
  const userId = normalizeScopeId(normalized.userId);
  const permissionsVersion = Number(normalized.permissionsVersion || 1);

  const cacheKey = `${userId}:${permissionsVersion}:${effectiveActiveBranchId || "_"}:effective`;
  return getOrLoadEffectiveContext(cacheKey, async () => {
    const explicitGrants = await loadActiveUserPermissionGrants({
      userId: normalized.userId,
      permissionsVersion: normalized.permissionsVersion,
    });

    const roleGrants = buildRolePermissionGrants({
      ...normalized,
      activeBranchId: effectiveActiveBranchId,
    });

    const selected = selectBaseGrants({
      explicitGrants,
      roleGrants,
      preferredPermissionMode: normalized.permissionMode,
    });
    const permissionGrants = dedupePermissionGrants(selected.grants);

    const explicitBranchIds = collectBranchScopeIdsFromGrants(permissionGrants);
    const allowedBranchIds = toUniqueStrings([
      ...(normalized.allowedBranchIds || []),
      ...explicitBranchIds,
    ]);

    const authzSnapshot = {
      ...normalized,
      activeBranchId: effectiveActiveBranchId,
      allowedBranchIds,
      permissionMode: selected.permissionMode,
      permissionGrants,
    };
    authzSnapshot.permissions = buildPermissionSet(authzSnapshot);
    authzSnapshot.permissionGrantMap = buildPermissionGrantMap(permissionGrants);

    return authzSnapshot;
  });
};

export const authorizePermission = ({
  authz,
  permission,
  mode = "branch",
  requireActiveBranch = false,
  resource = null,
} = {}) => {
  return evaluatePolicy({
    action: permission,
    authz,
    mode,
    requireActiveBranch,
    resource,
  });
};

export default {
  resolveEffectiveAccessContext,
  authorizePermission,
};
