import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import {
  canReviewProduct,
  createReview,
  deleteReview,
  getProductReviews,
  likeReview,
  replyToReview,
  toggleReviewVisibility,
  updateAdminReply,
  updateReview,
} from "./reviewController.js";
import { getReviewUploadSignature } from "./reviewUploadController.js";

const router = express.Router();

const buildRateLimitKey = (req) => {
  const userId = req?.user?._id ? String(req.user._id) : "anonymous";
  return `${userId}:${ipKeyGenerator(req.ip || "")}`;
};

const reviewUploadSignatureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildRateLimitKey,
  message: {
    success: false,
    code: "REVIEW_UPLOAD_SIGNATURE_RATE_LIMIT",
    message: "Too many upload signature requests. Please try again in 1 minute.",
  },
});

// Prevent review spam while still allowing normal usage.
const createReviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildRateLimitKey,
  message: {
    success: false,
    code: "REVIEW_CREATE_RATE_LIMIT",
    message: "Too many review submissions. Please try again later.",
  },
});

router.get("/product/:productId", getProductReviews);

router.get(
  "/can-review/:productId",
  protect,
  restrictTo("CUSTOMER"),
  canReviewProduct
);

router.use(protect);

router.post(
  "/upload/signature",
  restrictTo("CUSTOMER", "ADMIN"),
  reviewUploadSignatureLimiter,
  getReviewUploadSignature
);

router.post("/", restrictTo("CUSTOMER"), createReviewLimiter, createReview);
router.put("/:id", restrictTo("CUSTOMER"), updateReview);

router.delete("/:id", restrictTo("CUSTOMER", "ADMIN"), deleteReview);
router.post("/:id/like", restrictTo("CUSTOMER", "ADMIN"), likeReview);

router.post("/:id/reply", restrictTo("ADMIN"), replyToReview);
router.put("/:id/reply", restrictTo("ADMIN"), updateAdminReply);
router.patch("/:id/toggle-visibility", restrictTo("ADMIN"), toggleReviewVisibility);

export default router;
