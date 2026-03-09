import mongoose from "mongoose";
import Permission from "../modules/auth/Permission.js";
import PermissionTemplate from "../modules/auth/PermissionTemplate.js";
import TemplatePermission from "../modules/auth/TemplatePermission.js";
import UserPermission from "../modules/auth/UserPermission.js";
import { logPermissionAuditEvent } from "../modules/auth/permissionAuditService.js";
import { getOrLoadRawPermissionGrants, invalidateUserPermissionCache } from "./effectivePermissionCache.js";
import { SCOPE_TYPES, ensurePermissionCatalogSeeded } from "./permissionCatalog.js";

const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();
const normalizeScopeType = (value) => String(value || "").trim().toUpperCase();
const normalizeScopeId = (value) => String(value || "").trim();
const normalizeTemplateKey = (value) => String(value || "").trim().toUpperCase();

const toUniqueStrings = (items = []) => {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
};

const buildAssignmentKey = ({ key, scopeType, scopeId }) =>
  `${normalizePermissionKey(key)}|${normalizeScopeType(scopeType)}|${normalizeScopeId(scopeId)}`;

const isValidScopeType = (scopeType) =>
  [SCOPE_TYPES.GLOBAL, SCOPE_TYPES.BRANCH, SCOPE_TYPES.SELF].includes(scopeType);

const toUserPermissionCacheKey = (userId, permissionsVersion = 1) =>
  `${String(userId || "").trim()}:${Number(permissionsVersion || 1)}:raw`;

export const loadPermissionCatalogMap = async ({ includeInactive = false } = {}) => {
  await ensurePermissionCatalogSeeded();

  const filter = includeInactive ? {} : { isActive: true };
  const permissions = await Permission.find(filter)
    .select("_id key module action scopeType isSensitive isActive")
    .lean();

  const byKey = new Map();
  for (const permission of permissions) {
    const key = normalizePermissionKey(permission.key);
    byKey.set(key, {
      id: String(permission._id),
      key,
      module: permission.module,
      action: permission.action,
      scopeType: permission.scopeType,
      isSensitive: Boolean(permission.isSensitive),
      isActive: Boolean(permission.isActive),
    });
  }

  return byKey;
};

const expandTemplateAssignments = async ({
  templateKeys = [],
  branchIds = [],
  targetUserId = "",
}) => {
  const normalizedTemplateKeys = toUniqueStrings(templateKeys.map(normalizeTemplateKey));
  if (!normalizedTemplateKeys.length) {
    return [];
  }

  const templates = await PermissionTemplate.find({
    key: { $in: normalizedTemplateKeys },
    isActive: true,
  })
    .select("_id key")
    .lean();

  const templateIdToKey = new Map(templates.map((item) => [String(item._id), normalizeTemplateKey(item.key)]));
  const templateIds = Array.from(templateIdToKey.keys());
  if (!templateIds.length) {
    return [];
  }

  const mappings = await TemplatePermission.find({
    templateId: { $in: templateIds },
  })
    .populate("permissionId", "key scopeType isSensitive isActive")
    .select("templateId permissionId scopeType scopeId")
    .lean();

  const expanded = [];
  for (const row of mappings) {
    const permission = row.permissionId;
    if (!permission || !permission.isActive) continue;

    const key = normalizePermissionKey(permission.key);
    const scopeType = normalizeScopeType(row.scopeType || permission.scopeType);
    const scopeId = normalizeScopeId(row.scopeId);
    const templateKey = templateIdToKey.get(String(row.templateId)) || "";

    if (scopeType === SCOPE_TYPES.BRANCH) {
      const branchScopeIds = scopeId ? [scopeId] : branchIds;
      for (const branchId of branchScopeIds) {
        expanded.push({
          key,
          scopeType,
          scopeId: normalizeScopeId(branchId),
          fromTemplateKey: templateKey,
        });
      }
      continue;
    }

    if (scopeType === SCOPE_TYPES.SELF) {
      expanded.push({
        key,
        scopeType,
        scopeId: scopeId || normalizeScopeId(targetUserId),
        fromTemplateKey: templateKey,
      });
      continue;
    }

    expanded.push({
      key,
      scopeType,
      scopeId: "",
      fromTemplateKey: templateKey,
    });
  }

  return expanded;
};

export const normalizeRequestedPermissionAssignments = async ({
  permissions = [],
  templateKeys = [],
  branchIds = [],
  targetUserId = "",
} = {}) => {
  const catalogMap = await loadPermissionCatalogMap();
  const normalizedBranchIds = toUniqueStrings(branchIds.map(normalizeScopeId));

  const explicitAssignments = Array.isArray(permissions) ? permissions : [];
  const templateAssignments = await expandTemplateAssignments({
    templateKeys,
    branchIds: normalizedBranchIds,
    targetUserId,
  });

  const combined = [...templateAssignments, ...explicitAssignments];
  const deduped = new Map();
  const errors = [];

  for (const raw of combined) {
    const key = normalizePermissionKey(raw?.key || raw?.permissionKey);
    if (!key) continue;

    const catalog = catalogMap.get(key);
    if (!catalog || !catalog.isActive) {
      errors.push(`Unknown permission key: ${key}`);
      continue;
    }

    const requestedScopeType = normalizeScopeType(raw?.scopeType || catalog.scopeType);
    if (!isValidScopeType(requestedScopeType)) {
      errors.push(`Invalid scope type for ${key}: ${requestedScopeType}`);
      continue;
    }

    if (requestedScopeType !== catalog.scopeType) {
      errors.push(`Scope mismatch for ${key}: expected ${catalog.scopeType}, got ${requestedScopeType}`);
      continue;
    }

    const requestedScopeIds = [];
    if (requestedScopeType === SCOPE_TYPES.BRANCH) {
      const rowScopeId = normalizeScopeId(raw?.scopeId);
      const rowBranchIds = Array.isArray(raw?.branchIds) ? raw.branchIds : [];
      const mergedScopeIds = toUniqueStrings([rowScopeId, ...rowBranchIds, ...normalizedBranchIds]);
      if (!mergedScopeIds.length) {
        errors.push(`Branch scope requires scopeId/branchIds for permission ${key}`);
        continue;
      }
      requestedScopeIds.push(...mergedScopeIds);
    } else if (requestedScopeType === SCOPE_TYPES.SELF) {
      requestedScopeIds.push(normalizeScopeId(raw?.scopeId || targetUserId));
    } else {
      requestedScopeIds.push("");
    }

    for (const scopeId of requestedScopeIds) {
      const normalizedScopeId = requestedScopeType === SCOPE_TYPES.GLOBAL ? "" : normalizeScopeId(scopeId);
      const assignment = {
        key,
        scopeType: requestedScopeType,
        scopeId: normalizedScopeId,
        module: catalog.module,
        action: catalog.action,
        isSensitive: Boolean(catalog.isSensitive),
      };
      deduped.set(buildAssignmentKey(assignment), assignment);
    }
  }

  return {
    assignments: Array.from(deduped.values()),
    errors,
  };
};

export const validateGrantAntiEscalation = ({
  actorAuthz,
  assignments = [],
  targetUserId = "",
}) => {
  const violations = [];
  const actorPermissionSet = actorAuthz?.permissions || new Set();
  const actorAllowedBranchIds = toUniqueStrings(actorAuthz?.allowedBranchIds || []);
  const actorId = String(actorAuthz?.userId || "").trim();
  const isGlobalAdmin = Boolean(actorAuthz?.isGlobalAdmin);

  for (const assignment of assignments) {
    const key = normalizePermissionKey(assignment.key);
    const scopeType = normalizeScopeType(assignment.scopeType);
    const scopeId = normalizeScopeId(assignment.scopeId);

    if (!isGlobalAdmin && scopeType === SCOPE_TYPES.GLOBAL) {
      violations.push(`Global scope grant is forbidden for non-global admin (${key})`);
      continue;
    }

    if (!isGlobalAdmin && !actorPermissionSet.has("*") && !actorPermissionSet.has(key)) {
      violations.push(`Cannot grant permission not owned by actor (${key})`);
      continue;
    }

    if (!isGlobalAdmin && scopeType === SCOPE_TYPES.BRANCH) {
      if (!scopeId || !actorAllowedBranchIds.includes(scopeId)) {
        violations.push(`Cannot grant permission outside actor branch scope (${key}:${scopeId || "n/a"})`);
        continue;
      }
    }

    if (!isGlobalAdmin && scopeType === SCOPE_TYPES.SELF) {
      const normalizedTargetUserId = normalizeScopeId(targetUserId);
      if (scopeId && normalizedTargetUserId && scopeId !== normalizedTargetUserId) {
        violations.push(`SELF scope must target the user itself (${key})`);
        continue;
      }
      if (scopeId && actorId && scopeId !== actorId && scopeId !== normalizedTargetUserId) {
        violations.push(`Cannot grant SELF scope to another actor (${key})`);
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
};

export const loadActiveUserPermissionGrants = async ({
  userId,
  permissionsVersion = 1,
} = {}) => {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return [];
  }

  if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) {
    return [];
  }

  const cacheKey = toUserPermissionCacheKey(normalizedUserId, permissionsVersion);
  const rawRows = await getOrLoadRawPermissionGrants(cacheKey, async () => {
    const rows = await UserPermission.find({
      userId: normalizedUserId,
      status: "ACTIVE",
    })
      .populate("permissionId", "key module action scopeType isSensitive isActive")
      .select("permissionId scopeType scopeId grantedBy grantedAt")
      .lean();
    return rows;
  });

  const grants = [];
  for (const row of rawRows) {
    const permission = row.permissionId;
    if (!permission || !permission.isActive) continue;
    const key = normalizePermissionKey(permission.key);
    grants.push({
      key,
      module: permission.module,
      action: permission.action,
      scopeType: normalizeScopeType(row.scopeType || permission.scopeType),
      scopeId: normalizeScopeId(row.scopeId),
      isSensitive: Boolean(permission.isSensitive),
      grantedBy: row.grantedBy ? String(row.grantedBy) : "",
      grantedAt: row.grantedAt || null,
      source: "EXPLICIT",
    });
  }

  return grants;
};

export const applyUserPermissionAssignments = async ({
  targetUserId,
  assignments = [],
  actorUserId = null,
  req = null,
  reason = "",
} = {}) => {
  const normalizedTargetUserId = String(targetUserId || "").trim();
  if (!normalizedTargetUserId) {
    throw new Error("targetUserId is required");
  }

  const catalogMap = await loadPermissionCatalogMap();

  const existingRows = await UserPermission.find({
    userId: normalizedTargetUserId,
    status: "ACTIVE",
  })
    .populate("permissionId", "key")
    .select("_id permissionId scopeType scopeId status")
    .lean();

  const existingByKey = new Map();
  for (const row of existingRows) {
    const key = normalizePermissionKey(row?.permissionId?.key);
    if (!key) continue;
    const assignmentKey = buildAssignmentKey({
      key,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
    });
    existingByKey.set(assignmentKey, row);
  }

  const targetByKey = new Map();
  for (const assignment of assignments) {
    targetByKey.set(buildAssignmentKey(assignment), assignment);
  }

  const revokeRowIds = [];
  const revokedEntries = [];
  for (const [assignmentKey, row] of existingByKey.entries()) {
    if (!targetByKey.has(assignmentKey)) {
      revokeRowIds.push(String(row._id));
      revokedEntries.push({
        key: normalizePermissionKey(row?.permissionId?.key),
        scopeType: normalizeScopeType(row.scopeType),
        scopeId: normalizeScopeId(row.scopeId),
      });
    }
  }

  const grantDocs = [];
  const grantedEntries = [];
  for (const [assignmentKey, assignment] of targetByKey.entries()) {
    if (existingByKey.has(assignmentKey)) {
      continue;
    }
    const catalog = catalogMap.get(normalizePermissionKey(assignment.key));
    if (!catalog) continue;
    grantDocs.push({
      userId: normalizedTargetUserId,
      permissionId: catalog.id,
      scopeType: normalizeScopeType(assignment.scopeType),
      scopeId: normalizeScopeId(assignment.scopeId),
      status: "ACTIVE",
      grantedBy: actorUserId || undefined,
      grantedAt: new Date(),
    });
    grantedEntries.push({
      key: normalizePermissionKey(assignment.key),
      scopeType: normalizeScopeType(assignment.scopeType),
      scopeId: normalizeScopeId(assignment.scopeId),
      isSensitive: Boolean(catalog.isSensitive),
    });
  }

  if (revokeRowIds.length) {
    await UserPermission.updateMany(
      { _id: { $in: revokeRowIds } },
      {
        $set: {
          status: "REVOKED",
          revokedBy: actorUserId || null,
          revokedAt: new Date(),
          revokeReason: reason || "permission_sync",
        },
      }
    );
  }

  if (grantDocs.length) {
    await UserPermission.insertMany(grantDocs, { ordered: false });
  }

  invalidateUserPermissionCache(normalizedTargetUserId);

  if (req) {
    for (const granted of grantedEntries) {
      await logPermissionAuditEvent({
        req,
        targetUserId: normalizedTargetUserId,
        actionType: "PERMISSION_GRANTED",
        oldValues: {},
        newValues: granted,
        changedPaths: ["permissions"],
        note: "Permission grant applied",
        reason,
        metadata: {
          permission: granted.key,
          scopeType: granted.scopeType,
          scopeId: granted.scopeId,
          isSensitive: Boolean(granted.isSensitive),
        },
      });
    }

    for (const revoked of revokedEntries) {
      await logPermissionAuditEvent({
        req,
        targetUserId: normalizedTargetUserId,
        actionType: "PERMISSION_REVOKED",
        oldValues: revoked,
        newValues: {},
        changedPaths: ["permissions"],
        note: "Permission revoke applied",
        reason,
        metadata: {
          permission: revoked.key,
          scopeType: revoked.scopeType,
          scopeId: revoked.scopeId,
        },
      });
    }
  }

  return {
    grantedCount: grantedEntries.length,
    revokedCount: revokedEntries.length,
    grantedEntries,
    revokedEntries,
  };
};

export const collectBranchScopeIdsFromGrants = (grants = []) => {
  return toUniqueStrings(
    grants
      .filter((grant) => normalizeScopeType(grant.scopeType) === SCOPE_TYPES.BRANCH)
      .map((grant) => normalizeScopeId(grant.scopeId))
  );
};

export default {
  loadPermissionCatalogMap,
  normalizeRequestedPermissionAssignments,
  validateGrantAntiEscalation,
  loadActiveUserPermissionGrants,
  applyUserPermissionAssignments,
  collectBranchScopeIdsFromGrants,
};
