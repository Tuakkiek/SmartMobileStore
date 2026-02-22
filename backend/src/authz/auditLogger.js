import AuthzAuditLog from "../modules/auth/AuthzAuditLog.js";
import { omniLog } from "../utils/logger.js";

export const logAuthzDecision = async ({
  req,
  action,
  decision,
  reasonCode,
  scopeMode,
  resourceType,
  resourceId,
  metadata = {},
} = {}) => {
  try {
    if (!req || !action || !decision) {
      return;
    }

    const requestId =
      req.headers?.["x-request-id"] || req.headers?.["x-correlation-id"] || "";

    await AuthzAuditLog.create({
      actorId: req.user?._id,
      action,
      decision,
      reasonCode,
      scopeMode,
      activeBranchId: req.authz?.activeBranchId || undefined,
      simulatedBranchId: req.authz?.simulatedBranchId || undefined,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      requestId: requestId ? String(requestId) : undefined,
      method: req.method,
      path: req.originalUrl || req.path,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"] || "",
      metadata,
    });
  } catch (error) {
    omniLog.warn("authz audit logging failed", {
      action,
      decision,
      reasonCode,
      error: error.message,
    });
  }
};
