// ============================================
// FILE: backend/src/routes/reviewRoutes.js
// ✅ COMPLETE & VERIFIED
// ============================================

import express from "express";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  replyToReview,
  updateAdminReply,
  toggleReviewVisibility,
} from "../controllers/reviewController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
// Get reviews for a product (no auth required for viewing)
router.get("/product/:productId", getProductReviews);

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================
router.use(protect); // All routes below require authentication

// ============================================
// CUSTOMER ROUTES
// ============================================
router.post("/", restrictTo("CUSTOMER"), createReview);
router.put("/:id", restrictTo("CUSTOMER"), updateReview);
router.delete("/:id", restrictTo("CUSTOMER"), deleteReview);

// ============================================
// ✅ LIKE/UNLIKE ROUTE (any authenticated user)
// ============================================
router.post("/:id/like", likeReview);

// ============================================
// ADMIN ROUTES
// ============================================
router.post("/:id/reply", restrictTo("ADMIN"), replyToReview);
router.put("/:id/reply", restrictTo("ADMIN"), updateAdminReply);
router.patch("/:id/toggle-visibility", restrictTo("ADMIN"), toggleReviewVisibility);

export default router;