import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from "./notificationController.js";

const router = express.Router();

router.use(protect);

router.get("/my-notifications", getMyNotifications);
router.put("/mark-all-read", markAllAsRead);
router.put("/:notificationId/read", markAsRead);

export default router;

