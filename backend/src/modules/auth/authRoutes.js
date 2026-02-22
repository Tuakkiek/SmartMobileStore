import express from "express";
import {
  register,
  login,
  logout,
  changePassword,
  getCurrentUser,
  updateAvatar,
  checkCustomerByPhone,
  quickRegisterCustomer,
  getEffectivePermissions,
  setActiveBranchContext,
  setSimulatedBranchContext,
  clearSimulatedBranchContext,
} from "./authController.js";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);
router.get("/context/permissions", protect, resolveAccessContext, getEffectivePermissions);
router.put("/context/active-branch", protect, resolveAccessContext, setActiveBranchContext);
router.put("/context/simulate-branch", protect, resolveAccessContext, setSimulatedBranchContext);
router.delete("/context/simulate-branch", protect, resolveAccessContext, clearSimulatedBranchContext);
router.put("/change-password", protect, changePassword);
router.put("/avatar", protect, updateAvatar);
router.get("/check-customer", protect, restrictTo("POS_STAFF", "ADMIN"), checkCustomerByPhone);
router.post("/quick-register", protect, restrictTo("POS_STAFF", "ADMIN"), quickRegisterCustomer);

export default router;
