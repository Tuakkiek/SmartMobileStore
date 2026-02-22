import { ROLE_PERMISSIONS } from "./actions.js";

const DENY = (code, message) => ({
  allowed: false,
  code,
  message,
});

const ALLOW = () => ({ allowed: true, code: "AUTHZ_ALLOWED" });

const rolePermissions = (role) => ROLE_PERMISSIONS[role] || [];

export const buildPermissionSet = (authz) => {
  const permissions = new Set();

  // System roles are global (e.g. GLOBAL_ADMIN → "*")
  for (const role of (authz?.systemRoles || [])) {
    for (const permission of rolePermissions(role)) {
      permissions.add(permission);
    }
  }

  // Task roles are global (e.g. SHIPPER)
  for (const role of (authz?.taskRoles || [])) {
    for (const permission of rolePermissions(role)) {
      permissions.add(permission);
    }
  }

  // ── KILL-SWITCH FIX: Only unpack roles from the ACTIVE branch ──
  // A role in Branch A must NOT grant permissions in Branch B.
  const activeBranchId = authz?.activeBranchId ? String(authz.activeBranchId) : "";
  if (activeBranchId) {
    const activeAssignment = (authz?.branchAssignments || []).find(
      (a) => String(a.storeId) === activeBranchId
    );
    if (activeAssignment) {
      for (const role of (activeAssignment.roles || [])) {
        for (const permission of rolePermissions(role)) {
          permissions.add(permission);
        }
      }
    }
  }

  // Legacy fallback: if authz.role is set and user has no V2 data,
  // still grant permissions for the legacy role (for backward compat during migration)
  if (authz?.role && !authz?.systemRoles?.length && !authz?.branchAssignments?.length) {
    for (const permission of rolePermissions(authz.role)) {
      permissions.add(permission);
    }
  }

  return permissions;
};

export const hasPermission = (authz, action) => {
  if (!action) return false;
  if (!authz?.permissions || !(authz.permissions instanceof Set)) {
    return false;
  }
  return authz.permissions.has("*") || authz.permissions.has(action);
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

  if (!hasPermission(authz, action)) {
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

  if (requireActiveBranch && mode === "branch" && !activeBranchId) {
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
