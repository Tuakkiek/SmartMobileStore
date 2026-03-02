// ============================================
// FILE: backend/src/routes/reviewRoutes.js
// ✅ UPDATED: Added canReview endpoint
// ============================================

import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import {
  canReviewProduct,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  replyToReview,
  updateAdminReply,
  toggleReviewVisibility,
} from "./reviewController.js";
import { getReviewUploadSignature } from "./reviewUploadController.js";

const router = express.Router();

const reviewUploadSignatureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req?.user?._id ? String(req.user._id) : "anonymous";
    return `${userId}:${ipKeyGenerator(req.ip || "")}`;
  },
  message: {
    success: false,
    message: "Too many upload signature requests. Please try again in 1 minute.",
  },
});

// ✅ NEW: Check if user can review product
router.get(
  "/can-review/:productId",
  protect,
  restrictTo("CUSTOMER"),
  canReviewProduct
);

// Public route
router.get("/product/:productId", getProductReviews);

// Customer routes
router.use(protect);
router.use(restrictTo("CUSTOMER", "ADMIN"));

router.post(
  "/upload/signature",
  reviewUploadSignatureLimiter,
  getReviewUploadSignature
);

router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);
router.post("/:id/like", likeReview);

// Admin routes
router.post("/:id/reply", restrictTo("ADMIN"), replyToReview);
router.put("/:id/reply", restrictTo("ADMIN"), updateAdminReply);
router.patch(
  "/:id/toggle-visibility",
  restrictTo("ADMIN"),
  toggleReviewVisibility
);

export default router;
