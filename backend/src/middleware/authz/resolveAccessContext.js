import { normalizeUserAccess } from "../../authz/userAccessResolver.js";
import { buildPermissionSet } from "../../authz/policyEngine.js";
import { runWithBranchContext } from "../../authz/branchContext.js";

const deny = (res, code, message, status = 403) =>
  res.status(status).json({
    success: false,
    code,
    message,
  });

export const resolveAccessContext = async (req, res, next) => {
  if (!req.user) {
    return deny(res, "AUTHN_REQUIRED", "Authentication required", 401);
  }

  const normalized = normalizeUserAccess(req.user);
  if (normalized.authzState === "REVIEW_REQUIRED") {
    return deny(
      res,
      "AUTHZ_REVIEW_REQUIRED",
      "Access review is required before this account can continue",
    );
  }

  const isGlobalAdmin = normalized.isGlobalAdmin;
  const isCustomer = req.user.role === "CUSTOMER";
  const isShipper = req.user.role === "SHIPPER";
  const allowedBranchIds = normalized.allowedBranchIds || [];

  const headerActiveBranch = req.headers?.["x-active-branch-id"]
    ? String(req.headers["x-active-branch-id"]).trim()
    : "";
  const headerSimulatedBranch = req.headers?.["x-simulate-branch-id"]
    ? String(req.headers["x-simulate-branch-id"]).trim()
    : "";

  const isBranchScopedStaff =
    !isGlobalAdmin &&
    !isCustomer &&
    !isShipper &&
    normalized.requiresBranchAssignment;

  if (isBranchScopedStaff && allowedBranchIds.length !== 1) {
    return deny(
      res,
      "AUTHZ_INVALID_BRANCH_ASSIGNMENT",
      "Staff account must have exactly one active branch assignment",
    );
  }

  const fixedBranchId = isBranchScopedStaff ? String(allowedBranchIds[0] || "") : "";

  if (isBranchScopedStaff && headerActiveBranch && headerActiveBranch !== fixedBranchId) {
    return deny(
      res,
      "AUTHZ_BRANCH_SWITCH_FORBIDDEN",
      "Branch context is fixed for this account",
    );
  }

  if (!isGlobalAdmin && headerSimulatedBranch) {
    return deny(
      res,
      "AUTHZ_SIMULATION_FORBIDDEN",
      "Branch simulation is restricted to global admin",
    );
  }

  let contextMode = "STANDARD";
  let activeBranchId = "";
  let simulatedBranchId = "";

  if (isGlobalAdmin && headerSimulatedBranch) {
    contextMode = "SIMULATED";
    simulatedBranchId = headerSimulatedBranch;
    activeBranchId = headerSimulatedBranch;
  } else if (isBranchScopedStaff) {
    activeBranchId = fixedBranchId;
  } else if (headerActiveBranch) {
    activeBranchId = headerActiveBranch;
  }

  if (!isGlobalAdmin && !isCustomer && !isShipper && activeBranchId) {
    if (!allowedBranchIds.includes(activeBranchId)) {
      return deny(
        res,
        "AUTHZ_BRANCH_FORBIDDEN",
        "Requested branch is not assigned to current user",
      );
    }
  }

  const noBranchAssigned =
    !isGlobalAdmin &&
    !isCustomer &&
    !isShipper &&
    normalized.requiresBranchAssignment &&
    allowedBranchIds.length === 0;

  let scopeMode = "branch";
  if (isGlobalAdmin && !headerSimulatedBranch) {
    scopeMode = "global";
  }

  const authzContext = {
    ...normalized,
    isGlobalAdmin,
    isCustomer,
    allowedBranchIds,
    activeBranchId: activeBranchId || "",
    simulatedBranchId,
    contextMode,
    noBranchAssigned,
    scopeMode,
  };
  authzContext.permissions = buildPermissionSet(authzContext);

  req.authz = authzContext;

  const ormContext = {
    activeBranchId: authzContext.activeBranchId,
    isGlobalAdmin: authzContext.isGlobalAdmin,
    scopeMode: authzContext.scopeMode,
    userId: authzContext.userId,
  };

  return runWithBranchContext(ormContext, () => next());
};

export default resolveAccessContext;
