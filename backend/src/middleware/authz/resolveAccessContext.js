import { normalizeUserAccess } from "../../authz/userAccessResolver.js";
import { buildPermissionSet } from "../../authz/policyEngine.js";
import { runWithBranchContext } from "../../authz/branchContext.js";

// ============================================
// KILL-SWITCH: Single source of truth
// Only X-Active-Branch-Id header is accepted.
// No cookies. No query params. No body params.
// ============================================

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
  const allowedBranchIds = normalized.allowedBranchIds || [];

  // ── SINGLE SOURCE OF TRUTH ──
  // Active branch: ONLY from X-Active-Branch-Id header
  const headerActiveBranch = req.headers?.["x-active-branch-id"]
    ? String(req.headers["x-active-branch-id"]).trim()
    : "";

  // Simulation: ONLY from X-Simulate-Branch-Id header (GLOBAL_ADMIN only)
  const headerSimulatedBranch = req.headers?.["x-simulate-branch-id"]
    ? String(req.headers["x-simulate-branch-id"]).trim()
    : "";

  let contextMode = "STANDARD";
  let activeBranchId = "";
  let simulatedBranchId = "";

  if (isGlobalAdmin && headerSimulatedBranch) {
    contextMode = "SIMULATED";
    simulatedBranchId = headerSimulatedBranch;
    activeBranchId = headerSimulatedBranch;
  } else if (headerActiveBranch) {
    activeBranchId = headerActiveBranch;
  }

  // ── ENFORCE: Non-global users MUST have a branch ──
  // Customer không cần branch context
  if (
    !isGlobalAdmin &&
    !isCustomer &&
    !activeBranchId &&
    normalized.requiresBranchAssignment
  ) {
    return deny(
      res,
      "AUTHZ_MISSING_BRANCH_CONTEXT",
      "Missing Active Branch Context. Send X-Active-Branch-Id header.",
      400,
    );
  }

  // ── ENFORCE: Simulation is GLOBAL_ADMIN only ──
  if (!isGlobalAdmin && headerSimulatedBranch) {
    return deny(
      res,
      "AUTHZ_SIMULATION_FORBIDDEN",
      "Branch simulation is restricted to global admin",
    );
  }

  // ── ENFORCE: Branch must be in allowed list ──
  // Customer không thuộc branch nào nên bỏ qua kiểm tra này
  if (!isGlobalAdmin && !isCustomer && activeBranchId) {
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
    normalized.requiresBranchAssignment &&
    allowedBranchIds.length === 0;

  // Determine scopeMode for ORM
  // Global admin defaults to 'global' scope unless simulating a specific branch
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

  // ── PHASE 1: Freeze the context ──
  req.authz = authzContext;

  // ── PHASE 4: Store context in AsyncLocalStorage for ORM plugin ──
  const ormContext = {
    activeBranchId: authzContext.activeBranchId,
    isGlobalAdmin: authzContext.isGlobalAdmin,
    scopeMode: authzContext.scopeMode,
    userId: authzContext.userId,
  };

  return runWithBranchContext(ormContext, () => next());
};

export default resolveAccessContext;