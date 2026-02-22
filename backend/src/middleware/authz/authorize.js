import { evaluatePolicy } from "../../authz/policyEngine.js";
import { logAuthzDecision } from "../../authz/auditLogger.js";

const resolveValue = (valueOrResolver, req, fallback) => {
  if (typeof valueOrResolver === "function") {
    return valueOrResolver(req);
  }
  if (valueOrResolver === undefined || valueOrResolver === null) {
    return fallback;
  }
  return valueOrResolver;
};

const defaultMessageByCode = Object.freeze({
  AUTHZ_ACTION_DENIED: "You do not have permission to perform this action",
  AUTHZ_GLOBAL_SCOPE_DENIED: "Global scope is not allowed for this account",
  AUTHZ_ACTIVE_BRANCH_REQUIRED: "Active branch context is required",
  AUTHZ_NO_BRANCH_ASSIGNED: "No branch is assigned to this account",
  AUTHZ_BRANCH_FORBIDDEN: "You cannot access data outside your branch scope",
  AUTHZ_TASK_NOT_ASSIGNED: "This task is not assigned to the current actor",
});

export const authorize = (actionOrResolver, options = {}) => async (req, res, next) => {
  if (!req.authz) {
    return res.status(401).json({
      success: false,
      code: "AUTHZ_CONTEXT_MISSING",
      message: "Authorization context is missing",
    });
  }

  const action = resolveValue(actionOrResolver, req, "");
  const scopeMode = resolveValue(options.scopeMode, req, "branch");
  const requireActiveBranch = Boolean(
    options.requireActiveBranch ||
      (Array.isArray(options.requireActiveBranchFor) &&
        options.requireActiveBranchFor.includes(scopeMode))
  );
  const resource = resolveValue(options.resource, req, null);

  const decision = evaluatePolicy({
    action,
    authz: req.authz,
    mode: scopeMode,
    requireActiveBranch,
    resource,
  });

  if (!decision.allowed) {
    await logAuthzDecision({
      req,
      action,
      decision: "DENY",
      reasonCode: decision.code,
      scopeMode,
      resourceType: options.resourceType || "",
      resourceId: resource?.id || resource?._id || resource?.resourceId || "",
      metadata: {
        message: decision.message,
      },
    });

    return res.status(403).json({
      success: false,
      code: decision.code,
      message: defaultMessageByCode[decision.code] || decision.message,
    });
  }

  req.authz.authorizedAction = action;
  req.authz.scopeMode = scopeMode;
  req.authz.authorizedResource = resource || null;

  if (options.audit !== false) {
    await logAuthzDecision({
      req,
      action,
      decision: "ALLOW",
      reasonCode: decision.code,
      scopeMode,
      resourceType: options.resourceType || "",
      resourceId: resource?.id || resource?._id || resource?.resourceId || "",
    });
  }

  return next();
};

export default authorize;
