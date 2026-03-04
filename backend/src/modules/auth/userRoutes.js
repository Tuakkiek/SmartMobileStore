import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import resolveAccessContext from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllEmployees,
  createEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  updateEmployeeAvatar,
  updateEmployee,
  getAllShippers,
  createUserWithPermissions,
  getPermissionsCatalogController,
  getPermissionTemplatesController,
  getEffectivePermissionsForUser,
  updateUserPermissions,
  previewPermissionAssignments,
} from "./userController.js";

const router = express.Router();

const resolveUserScopeMode = (req) => (req.authz?.isGlobalAdmin ? "global" : "branch");

const requireUsersRead = [
  resolveAccessContext,
  authorize(AUTHZ_ACTIONS.USERS_READ_BRANCH, {
    scopeMode: resolveUserScopeMode,
    requireActiveBranchFor: ["branch"],
    resourceType: "USER",
  }),
];

const requireUsersManage = [
  resolveAccessContext,
  authorize(AUTHZ_ACTIONS.USERS_MANAGE_BRANCH, {
    scopeMode: resolveUserScopeMode,
    requireActiveBranchFor: ["branch"],
    resourceType: "USER",
  }),
];

const requireOrdersRead = [
  resolveAccessContext,
  authorize(AUTHZ_ACTIONS.ORDERS_READ, {
    scopeMode: resolveUserScopeMode,
    requireActiveBranchFor: ["branch"],
    resourceType: "USER",
  }),
];

router.use(protect);

// Customer routes
router.put("/profile", restrictTo("CUSTOMER"), updateProfile);
router.post("/addresses", restrictTo("CUSTOMER"), addAddress);
router.put("/addresses/:addressId", restrictTo("CUSTOMER"), updateAddress);
router.delete("/addresses/:addressId", restrictTo("CUSTOMER"), deleteAddress);

// Permission catalog and template APIs
router.get("/permissions/catalog", ...requireUsersManage, getPermissionsCatalogController);
router.get("/permissions/templates", ...requireUsersManage, getPermissionTemplatesController);
router.post("/permissions/preview", ...requireUsersManage, previewPermissionAssignments);

// User CRUD and permission management
router.get("/employees", ...requireUsersRead, getAllEmployees);
router.post("/employees", ...requireUsersManage, createEmployee);
router.put("/employees/:id", ...requireUsersManage, updateEmployee);
router.put("/employees/:id/avatar", ...requireUsersManage, updateEmployeeAvatar);
router.patch("/employees/:id/toggle-status", ...requireUsersManage, toggleEmployeeStatus);
router.delete("/employees/:id", ...requireUsersManage, deleteEmployee);
router.get("/shippers", ...requireOrdersRead, getAllShippers);

// New granular permission endpoints
router.post("/", ...requireUsersManage, createUserWithPermissions);
router.put("/:id/permissions", ...requireUsersManage, updateUserPermissions);
router.get("/:id/effective-permissions", ...requireUsersManage, getEffectivePermissionsForUser);

export default router;
