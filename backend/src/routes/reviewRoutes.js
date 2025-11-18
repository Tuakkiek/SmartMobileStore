import express from "express";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  replyToReview,
  updateAdminReply, // ✅ THÊM DÒNG NÀY
  toggleReviewVisibility,
} from "../controllers/reviewController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route - anyone can view reviews
router.get("/product/:productId", getProductReviews);

// Customer routes
router.use(protect);
router.post("/", restrictTo("CUSTOMER"), createReview);
router.put("/:id", restrictTo("CUSTOMER"), updateReview);
router.delete("/:id", restrictTo("CUSTOMER"), deleteReview);

// ✅ NEW: Admin routes
router.post("/:id/reply", restrictTo("ADMIN"), replyToReview);
router.patch(
  "/:id/toggle-visibility",
  restrictTo("ADMIN"),
  toggleReviewVisibility
);
// reviewRoutes.js
router.put("/:id/reply", restrictTo("ADMIN"), updateAdminReply); // Update admin reply

export default router;
