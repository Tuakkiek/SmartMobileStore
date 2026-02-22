import mongoose from "mongoose";
import {
  LEGACY_TO_BRANCH_ROLE,
  SYSTEM_ROLES,
  TASK_ROLES,
  isBranchRole,
  isSystemRole,
  isTaskRole,
} from "./actions.js";

const toStringId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value?._id) return toStringId(value._id);
  return String(value).trim();
};

const normalizeBranchRoles = (roles = []) => {
  const output = new Set();
  for (const role of roles) {
    if (!role) continue;
    if (isBranchRole(role)) {
      output.add(role === "ADMIN" ? "BRANCH_ADMIN" : role);
      continue;
    }
    if (LEGACY_TO_BRANCH_ROLE[role]) {
      output.add(LEGACY_TO_BRANCH_ROLE[role]);
    }
  }
  return Array.from(output);
};

const dedupeBranchAssignments = (assignments = []) => {
  const byStore = new Map();
  for (const assignment of assignments) {
    const storeId = toStringId(assignment?.storeId);
    if (!storeId) continue;

    const existing = byStore.get(storeId) || {
      storeId,
      roles: [],
      status: "ACTIVE",
      isPrimary: false,
      assignedAt: assignment?.assignedAt || undefined,
      assignedBy: assignment?.assignedBy || undefined,
    };

    const mergedRoles = new Set([
      ...existing.roles,
      ...normalizeBranchRoles(assignment?.roles || []),
    ]);

    existing.roles = Array.from(mergedRoles);
    existing.status = assignment?.status || existing.status;
    existing.isPrimary = Boolean(existing.isPrimary || assignment?.isPrimary);
    existing.assignedAt = existing.assignedAt || assignment?.assignedAt || undefined;
    existing.assignedBy = existing.assignedBy || assignment?.assignedBy || undefined;

    byStore.set(storeId, existing);
  }
  return Array.from(byStore.values()).filter((item) => item.roles.length > 0);
};

export const deriveAuthzWriteFromLegacyInput = ({ role, storeLocation, assignedBy } = {}) => {
  const normalizedRole = String(role || "").trim().toUpperCase();
  const storeId = toStringId(storeLocation);

  const systemRoles = [];
  const taskRoles = [];
  const branchAssignments = [];
  let authzState = "ACTIVE";

  if (normalizedRole === "GLOBAL_ADMIN") {
    systemRoles.push("GLOBAL_ADMIN");
  } else if (normalizedRole === "SHIPPER") {
    taskRoles.push("SHIPPER");
  } else if (LEGACY_TO_BRANCH_ROLE[normalizedRole]) {
    if (storeId) {
      branchAssignments.push({
        storeId,
        roles: [LEGACY_TO_BRANCH_ROLE[normalizedRole]],
        status: "ACTIVE",
        isPrimary: true,
        assignedBy: assignedBy || undefined,
      });
    } else if (normalizedRole === "ADMIN") {
      authzState = "REVIEW_REQUIRED";
    }
  }

  return {
    systemRoles,
    taskRoles,
    branchAssignments,
    authzState,
  };
};

export const normalizeUserAccess = (user) => {
  const safeUser = user?.toObject ? user.toObject() : user || {};

  const role = String(safeUser.role || "").trim().toUpperCase();
  const rawSystemRoles = Array.isArray(safeUser.systemRoles)
    ? safeUser.systemRoles.filter(Boolean)
    : [];
  const rawTaskRoles = Array.isArray(safeUser.taskRoles)
    ? safeUser.taskRoles.filter(Boolean)
    : [];
  const rawAssignments = Array.isArray(safeUser.branchAssignments)
    ? safeUser.branchAssignments
    : [];

  const hasV2Fields =
    rawSystemRoles.length > 0 || rawTaskRoles.length > 0 || rawAssignments.length > 0;

  let systemRoles = rawSystemRoles.filter(isSystemRole);
  let taskRoles = rawTaskRoles.filter(isTaskRole);
  let branchAssignments = dedupeBranchAssignments(rawAssignments);
  let authzState = safeUser.authzState || "ACTIVE";

  if (!hasV2Fields) {
    const fallback = deriveAuthzWriteFromLegacyInput({
      role,
      storeLocation: safeUser.storeLocation,
    });
    systemRoles = fallback.systemRoles;
    taskRoles = fallback.taskRoles;
    branchAssignments = dedupeBranchAssignments(fallback.branchAssignments);
    authzState = fallback.authzState;
  }

  const defaultBranchId = toStringId(safeUser?.preferences?.defaultBranchId);
  const allowedBranchIds = branchAssignments
    .filter((assignment) => assignment.status === "ACTIVE")
    .map((assignment) => toStringId(assignment.storeId))
    .filter(Boolean);

  const primaryAssignment = branchAssignments.find((assignment) => assignment.isPrimary);
  const primaryBranchId = toStringId(primaryAssignment?.storeId);

  const requiresBranchAssignment =
    branchAssignments.length > 0 ||
    role === "ADMIN" ||
    role === "WAREHOUSE_MANAGER" ||
    role === "WAREHOUSE_STAFF" ||
    role === "ORDER_MANAGER" ||
    role === "PRODUCT_MANAGER" ||
    role === "POS_STAFF" ||
    role === "CASHIER";

  const isGlobalAdmin = systemRoles.includes("GLOBAL_ADMIN") || role === "GLOBAL_ADMIN";

  return {
    userId: toStringId(safeUser._id),
    role,
    authzVersion: Number(safeUser.authzVersion || 1),
    authzState,
    permissionsVersion: Number(safeUser.permissionsVersion || 1),
    systemRoles: Array.from(new Set(systemRoles)),
    taskRoles: Array.from(new Set(taskRoles)),
    branchAssignments,
    allowedBranchIds: Array.from(new Set(allowedBranchIds)),
    defaultBranchId: defaultBranchId || primaryBranchId || "",
    isGlobalAdmin,
    requiresBranchAssignment,
  };
};
