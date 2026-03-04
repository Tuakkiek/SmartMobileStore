import { normalizeUserAccess } from "../../authz/userAccessResolver.js";
import { resolveEffectiveAccessContext } from "../../authz/authorizationService.js";
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
  const bootstrapContext = await resolveEffectiveAccessContext({
    user: req.user,
    normalizedAccess: normalized,
    activeBranchId: "",
  });
  const allowedBranchIds = bootstrapContext.allowedBranchIds || [];
  const requiresBranchAssignment = Boolean(
    normalized.requiresBranchAssignment || allowedBranchIds.length > 0
  );

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
    requiresBranchAssignment;

  if (isBranchScopedStaff && allowedBranchIds.length === 0) {
    return deny(
      res,
      "AUTHZ_NO_BRANCH_ASSIGNED",
      "Staff account must have at least one active branch assignment",
    );
  }

  const defaultBranchId = isBranchScopedStaff ? String(allowedBranchIds[0] || "") : "";

  if (isBranchScopedStaff && headerActiveBranch && !allowedBranchIds.includes(headerActiveBranch)) {
    return deny(
      res,
      "AUTHZ_BRANCH_FORBIDDEN",
      "Requested branch is not assigned to current user",
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
    activeBranchId = headerActiveBranch || defaultBranchId;
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
    requiresBranchAssignment &&
    allowedBranchIds.length === 0;

  let scopeMode = "branch";
  if (isGlobalAdmin && !headerSimulatedBranch) {
    scopeMode = "global";
  }

  const resolvedAccess = await resolveEffectiveAccessContext({
    user: req.user,
    normalizedAccess: {
      ...normalized,
      allowedBranchIds,
      requiresBranchAssignment,
    },
    activeBranchId: activeBranchId || "",
  });

  const authzContext = {
    ...resolvedAccess,
    isGlobalAdmin,
    isCustomer,
    allowedBranchIds,
    activeBranchId: activeBranchId || "",
    simulatedBranchId,
    contextMode,
    noBranchAssigned,
    scopeMode,
    requiresBranchAssignment,
  };

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
