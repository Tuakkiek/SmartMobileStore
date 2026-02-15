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
} from "./authController.js"; // Đảm bảo bạn đã import getCurrentUser
import { protect, restrictTo } from "../../middleware/authMiddleware.js"; // Đảm bảo đúng tên file

const router = express.Router();


router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);
router.put("/change-password", protect, changePassword);
router.put("/avatar", protect, updateAvatar);
router.get("/check-customer", protect, restrictTo("POS_STAFF", "ADMIN"), checkCustomerByPhone);
router.post("/quick-register", protect, restrictTo("POS_STAFF", "ADMIN"), quickRegisterCustomer);

export default router;
