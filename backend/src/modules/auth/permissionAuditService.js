import { extractRequestContext, safeWriteAuditEntry } from "../audit/auditService.js";

const normalizeString = (value) => String(value || "").trim();

export const logPermissionAuditEvent = async ({
  req,
  targetUserId,
  actionType,
  outcome = "SUCCESS",
  oldValues = {},
  newValues = {},
  changedPaths = [],
  note = "",
  reason = "",
  metadata = {},
  failureContext = {},
} = {}) => {
  if (!targetUserId || !actionType) {
    return null;
  }

  const actorRole = normalizeString(req?.user?.role);
  const actorUserId = req?.user?._id || null;

  return safeWriteAuditEntry(
    {
      entityType: "USER_PERMISSION",
      entityId: String(targetUserId),
      actionType: normalizeString(actionType).toUpperCase(),
      outcome: normalizeString(outcome).toUpperCase() || "SUCCESS",
      actor: {
        actorType: actorUserId ? "USER" : "SYSTEM",
        userId: actorUserId,
        role: actorRole,
        source: "AUTHZ_PERMISSION_SERVICE",
      },
      branchId: req?.authz?.activeBranchId || null,
      oldValues,
      newValues,
      changedPaths,
      note,
      reason,
      requestContext: extractRequestContext(req),
      failureContext,
      metadata,
    },
    {
      targetUserId: String(targetUserId),
      actionType: normalizeString(actionType).toUpperCase(),
    }
  );
};

export default {
  logPermissionAuditEvent,
};
