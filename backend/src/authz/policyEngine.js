import { ROLE_PERMISSIONS } from "./actions.js";

const DENY = (code, message) => ({
  allowed: false,
  code,
  message,
});

const ALLOW = () => ({ allowed: true, code: "AUTHZ_ALLOWED" });

const normalizeRoleKey = (value) => String(value || "").trim().toUpperCase();
const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();
const normalizeScopeType = (value) => String(value || "").trim().toUpperCase();
const normalizeScopeId = (value) => String(value || "").trim();

const resolveRolePermissions = (role, rolePermissionMap = null) => {
  const normalizedRole = normalizeRoleKey(role);
  const mapped = rolePermissionMap?.get(normalizedRole);
  const mappedPermissions = Array.isArray(mapped?.permissions) ? mapped.permissions : [];

  if (mappedPermissions.length === 0) {
    return ROLE_PERMISSIONS[normalizedRole] || [];
  }

  if (
    normalizedRole === "GLOBAL_ADMIN" &&
    Array.isArray(ROLE_PERMISSIONS.GLOBAL_ADMIN) &&
    ROLE_PERMISSIONS.GLOBAL_ADMIN.includes("*") &&
    !mappedPermissions.some((permission) => normalizePermissionKey(permission?.key) === "*")
  ) {
    return [
      ...mappedPermissions,
      {
        key: "*",
        scopeType: "GLOBAL",
        scopeId: "",
      },
    ];
  }

  return mappedPermissions;
};

const inferScopeTypeFromPermission = (permission) => {
  const key = normalizePermissionKey(permission);
  if (key === "*") return "GLOBAL";
  if (key.endsWith(".global")) return "GLOBAL";
  if (key.endsWith(".personal")) return "SELF";
  if (key.startsWith("task.")) return "SELF";
  return "BRANCH";
};

const createGrant = ({
  key,
  scopeType,
  scopeId = "",
  sourceType = "ROLE",
  source = "",
  isSensitive = false,
} = {}) => {
  const normalizedKey = normalizePermissionKey(key);
  if (!normalizedKey) return null;

  const normalizedScopeType = normalizeScopeType(scopeType || inferScopeTypeFromPermission(normalizedKey));
  const normalizedScopeId = normalizeScopeId(scopeId);

  return {
    key: normalizedKey,
    scopeType: normalizedScopeType,
    scopeId: normalizedScopeType === "GLOBAL" ? "" : normalizedScopeId,
    sourceType,
    source,
    isSensitive: Boolean(isSensitive),
  };
};

const dedupeGrants = (grants = []) => {
  const byKey = new Map();
  for (const grant of grants) {
    const normalized = createGrant(grant);
    if (!normalized?.key) continue;
    const dedupeKey = `${normalized.key}|${normalized.scopeType}|${normalized.scopeId}`;
    byKey.set(dedupeKey, normalized);
  }
  return Array.from(byKey.values());
};

export const buildPermissionGrantMap = (grants = []) => {
  const map = new Map();
  for (const grant of dedupeGrants(grants)) {
    if (!map.has(grant.key)) {
      map.set(grant.key, []);
    }
    map.get(grant.key).push(grant);
  }
  return map;
};

export const buildRolePermissionGrants = (authz = {}, { rolePermissionMap = null } = {}) => {
  const grants = [];
  const activeBranchId = normalizeScopeId(authz?.activeBranchId);
  const userId = normalizeScopeId(authz?.userId);

  for (const role of authz?.systemRoles || []) {
    for (const permission of resolveRolePermissions(role, rolePermissionMap)) {
      const key = typeof permission === "string" ? permission : permission?.key;
      const scopeType =
        typeof permission === "string"
          ? inferScopeTypeFromPermission(key)
          : normalizeScopeType(permission?.scopeType || inferScopeTypeFromPermission(key));
      const scopeId = normalizeScopeId(permission?.scopeId);
      grants.push(
        createGrant({
          key,
          scopeType: key === "*" ? "GLOBAL" : scopeType,
          scopeId,
          sourceType: "SYSTEM",
          source: role,
        })
      );
    }
  }

  for (const role of authz?.taskRoles || []) {
    for (const permission of resolveRolePermissions(role, rolePermissionMap)) {
      const key = typeof permission === "string" ? permission : permission?.key;
      const inferredScopeType =
        typeof permission === "string"
          ? inferScopeTypeFromPermission(key)
          : normalizeScopeType(permission?.scopeType || inferScopeTypeFromPermission(key));
      const explicitScopeId = normalizeScopeId(permission?.scopeId);
      grants.push(
        createGrant({
          key,
          scopeType: inferredScopeType,
          scopeId: explicitScopeId || (inferredScopeType === "SELF" ? userId : ""),
          sourceType: "TASK",
          source: role,
        })
      );
    }
  }

  if (activeBranchId) {
    const activeAssignment = (authz?.branchAssignments || []).find(
      (assignment) => normalizeScopeId(assignment?.storeId) === activeBranchId
    );
    if (activeAssignment) {
      for (const role of activeAssignment.roles || []) {
        for (const permission of resolveRolePermissions(role, rolePermissionMap)) {
          const key = typeof permission === "string" ? permission : permission?.key;
          const inferredScopeType =
            typeof permission === "string"
              ? inferScopeTypeFromPermission(key)
              : normalizeScopeType(permission?.scopeType || inferScopeTypeFromPermission(key));
          const explicitScopeId = normalizeScopeId(permission?.scopeId);
          grants.push(
            createGrant({
              key,
              scopeType: inferredScopeType,
              scopeId:
                explicitScopeId ||
                (inferredScopeType === "BRANCH"
                  ? activeBranchId
                  : inferredScopeType === "SELF"
                    ? userId
                    : ""),
              sourceType: "BRANCH_ROLE",
              source: role,
            })
          );
        }
      }
    }
  }

  const hasV2Data =
    (authz?.systemRoles || []).length > 0 ||
    (authz?.taskRoles || []).length > 0 ||
    (authz?.branchAssignments || []).length > 0;
  const hasExplicitPermissionMode = String(authz?.permissionMode || "").toUpperCase() === "EXPLICIT";

  if (authz?.role && !hasV2Data && !hasExplicitPermissionMode) {
    for (const permission of resolveRolePermissions(authz.role, rolePermissionMap)) {
      const key = typeof permission === "string" ? permission : permission?.key;
      const inferredScopeType =
        typeof permission === "string"
          ? inferScopeTypeFromPermission(key)
          : normalizeScopeType(permission?.scopeType || inferScopeTypeFromPermission(key));
      const explicitScopeId = normalizeScopeId(permission?.scopeId);
      grants.push(
        createGrant({
          key,
          scopeType: inferredScopeType,
          scopeId: explicitScopeId || (inferredScopeType === "SELF" ? userId : ""),
          sourceType: "LEGACY_ROLE",
          source: authz.role,
        })
      );
    }
  }

  return dedupeGrants(grants);
};

export const buildPermissionSet = (authz) => {
  const permissions = new Set();
  const activeBranchId = normalizeScopeId(authz?.activeBranchId);
  const userId = normalizeScopeId(authz?.userId);
  const explicitMode = String(authz?.permissionMode || "").trim().toUpperCase() === "EXPLICIT";
  const rolePermissionMap = authz?.rolePermissionMap instanceof Map ? authz.rolePermissionMap : null;

  const grants =
    Array.isArray(authz?.permissionGrants)
      ? explicitMode || authz.permissionGrants.length > 0
        ? dedupeGrants(authz.permissionGrants)
        : buildRolePermissionGrants(authz)
      : buildRolePermissionGrants(authz, { rolePermissionMap });

  for (const grant of grants) {
    if (!grant) continue;
    if (grant.key === "*") {
      permissions.add("*");
      continue;
    }

    if (grant.scopeType === "GLOBAL") {
      permissions.add(grant.key);
      continue;
    }

    if (grant.scopeType === "BRANCH") {
      if (!grant.scopeId || (activeBranchId && grant.scopeId === activeBranchId)) {
        permissions.add(grant.key);
      }
      continue;
    }

    if (grant.scopeType === "SELF") {
      if (!grant.scopeId || (userId && grant.scopeId === userId)) {
        permissions.add(grant.key);
      }
    }
  }

  return permissions;
};

export const hasPermission = (authz, action, { mode = "branch", resource = null } = {}) => {
  if (!action) return false;
  const normalizedAction = normalizePermissionKey(action);
  const permissions = authz?.permissions;

  if (!(permissions instanceof Set)) {
    return false;
  }

  if (!permissions.has("*") && !permissions.has(normalizedAction)) {
    return false;
  }

  const permissionGrantMap =
    authz?.permissionGrantMap instanceof Map
      ? authz.permissionGrantMap
      : Array.isArray(authz?.permissionGrants)
        ? buildPermissionGrantMap(authz.permissionGrants)
        : null;

  if (!permissionGrantMap) {
    return true;
  }

  const grants = permissionGrantMap.get(normalizedAction) || [];
  if (!grants.length) {
    return true;
  }

  const targetBranchId = normalizeScopeId(resource?.branchId || authz?.activeBranchId);
  const targetAssigneeId = normalizeScopeId(
    resource?.assigneeId || resource?.userId || authz?.userId
  );

  for (const rawGrant of grants) {
    const grant = createGrant(rawGrant);
    if (!grant) continue;

    if (grant.key === "*") {
      return true;
    }

    if (grant.scopeType === "GLOBAL") {
      return true;
    }

    if (grant.scopeType === "BRANCH") {
      if (!grant.scopeId) return true;
      if (targetBranchId && grant.scopeId === targetBranchId) return true;
    }

    if (grant.scopeType === "SELF") {
      if (!grant.scopeId) return true;
      if (targetAssigneeId && grant.scopeId === targetAssigneeId) return true;
    }
  }

  if (mode === "global") {
    return false;
  }

  return false;
};

export const evaluatePolicy = ({
  action,
  authz,
  mode = "branch",
  requireActiveBranch = false,
  resource = null,
} = {}) => {
  if (!authz) {
    return DENY("AUTHZ_CONTEXT_MISSING", "Authorization context is required");
  }

  if (!action) {
    return DENY("AUTHZ_ACTION_MISSING", "Action is required");
  }

  if (!hasPermission(authz, action, { mode, resource })) {
    return DENY("AUTHZ_ACTION_DENIED", "Action is not granted");
  }

  const isGlobalAdmin = Boolean(authz.isGlobalAdmin || authz.systemRoles?.includes("GLOBAL_ADMIN"));
  const activeBranchId = authz.activeBranchId ? String(authz.activeBranchId) : "";
  const allowedBranchIds = Array.isArray(authz.allowedBranchIds)
    ? authz.allowedBranchIds.map((id) => String(id))
    : [];

  if (mode === "global" && !isGlobalAdmin) {
    return DENY("AUTHZ_GLOBAL_SCOPE_DENIED", "Global scope is not allowed");
  }

  if (requireActiveBranch && mode === "branch" && !activeBranchId && !isGlobalAdmin) {
    return DENY("AUTHZ_ACTIVE_BRANCH_REQUIRED", "Active branch context is required");
  }

  if (mode === "assigned" && !isGlobalAdmin && allowedBranchIds.length === 0) {
    return DENY("AUTHZ_NO_BRANCH_ASSIGNED", "No branch assignment is available");
  }

  if (!resource) {
    return ALLOW();
  }

  const resourceBranchId = resource.branchId ? String(resource.branchId) : "";
  if (resourceBranchId && !isGlobalAdmin) {
    if (mode === "assigned") {
      if (!allowedBranchIds.includes(resourceBranchId)) {
        return DENY("AUTHZ_BRANCH_FORBIDDEN", "Resource branch is outside assigned branches");
      }
    } else if (mode === "branch") {
      if (!activeBranchId || activeBranchId !== resourceBranchId) {
        return DENY("AUTHZ_BRANCH_FORBIDDEN", "Resource branch is outside active branch");
      }
    }
  }

  const resourceAssigneeId = resource.assigneeId ? String(resource.assigneeId) : "";
  if (resourceAssigneeId && !isGlobalAdmin && authz.taskRoles?.includes("SHIPPER")) {
    if (String(authz.userId) !== resourceAssigneeId) {
      return DENY("AUTHZ_TASK_NOT_ASSIGNED", "Task is not assigned to current actor");
    }
  }

  return ALLOW();
};
