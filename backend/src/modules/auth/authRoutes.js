import express from "express";
import {
  register,
  login,
  logout,
  changePassword,
  getCurrentUser,
} from "./authController.js"; // Đảm bảo bạn đã import getCurrentUser
import { protect } from "../../middleware/authMiddleware.js"; // Đảm bảo đúng tên file
import { updateAvatar } from "./authController.js";

const router = express.Router();


router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);
router.put("/change-password", protect, changePassword);
router.put("/avatar", protect, updateAvatar);

export default router;
