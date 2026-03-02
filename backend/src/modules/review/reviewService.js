import mongoose from "mongoose";

import Review from "./Review.js";
import ReviewHistory from "./ReviewHistory.js";
import Order from "../order/Order.js";
import UniversalProduct from "../product/UniversalProduct.js";
import { validateReviewImages } from "./reviewMediaValidation.js";
import { ReviewServiceError } from "./reviewErrors.js";

const ORDER_STATUS_COMPLETED = "COMPLETED";
const REVIEW_EDIT_WINDOW_DAYS = 7;
const REVIEW_EDIT_WINDOW_MS = REVIEW_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const MAX_REVIEW_EDITS = 1;

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ReviewServiceError({
      code: "REVIEW_INVALID_ID",
      status: 400,
      message: `Invalid ${fieldName}.`,
    });
  }

  return new mongoose.Types.ObjectId(value);
};

const normalizeRating = (value) => {
  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewServiceError({
      code: "REVIEW_INVALID_RATING",
      status: 400,
      message: "Rating must be an integer from 1 to 5.",
    });
  }

  return rating;
};

const normalizeComment = (value) => {
  if (typeof value !== "string") {
    throw new ReviewServiceError({
      code: "REVIEW_INVALID_COMMENT",
      status: 400,
      message: "Comment is required.",
    });
  }

  const comment = value.trim();

  if (!comment) {
    throw new ReviewServiceError({
      code: "REVIEW_INVALID_COMMENT",
      status: 400,
      message: "Comment is required.",
    });
  }

  if (comment.length > 3000) {
    throw new ReviewServiceError({
      code: "REVIEW_INVALID_COMMENT",
      status: 400,
      message: "Comment must be 3000 characters or fewer.",
    });
  }

  return comment;
};

const normalizeImages = (images) => {
  const imageValidation = validateReviewImages(images);

  if (!imageValidation.ok) {
    throw new ReviewServiceError({
      code: "REVIEW_INVALID_IMAGES",
      status: imageValidation.statusCode || 400,
      message: imageValidation.message,
    });
  }

  return imageValidation.images;
};

const ensureReviewableOrder = async ({ userId, productId, orderId }) => {
  const order = await Order.findOne({
    _id: orderId,
    status: ORDER_STATUS_COMPLETED,
    $or: [{ customerId: userId }, { userId }],
    "items.productId": productId,
  }).select("_id orderNumber status");

  if (!order) {
    throw new ReviewServiceError({
      code: "REVIEW_ORDER_NOT_ELIGIBLE",
      status: 403,
      message:
        "You can review only products you purchased in a COMPLETED order.",
    });
  }

  return order;
};

const ensureNoDuplicateReview = async ({ userId, productId, orderId }) => {
  const existingReview = await Review.findOne({
    userId,
    productId,
    orderId,
  }).select("_id");

  if (existingReview) {
    throw new ReviewServiceError({
      code: "REVIEW_DUPLICATE",
      status: 409,
      message: "A review already exists for this order and product.",
    });
  }
};

const ensureProductExists = async (productId) => {
  const exists = await UniversalProduct.exists({ _id: productId });

  if (!exists) {
    throw new ReviewServiceError({
      code: "REVIEW_PRODUCT_NOT_FOUND",
      status: 404,
      message: "Product not found.",
    });
  }
};

const ensureCanEditReview = ({ review, userId, now = new Date() }) => {
  if (String(review.userId) !== String(userId)) {
    throw new ReviewServiceError({
      code: "REVIEW_EDIT_FORBIDDEN",
      status: 403,
      message: "Only the review author can edit this review.",
    });
  }

  const createdAtMs = new Date(review.createdAt).getTime();
  const editDeadlineMs = createdAtMs + REVIEW_EDIT_WINDOW_MS;

  if (now.getTime() > editDeadlineMs) {
    throw new ReviewServiceError({
      code: "REVIEW_EDIT_WINDOW_EXPIRED",
      status: 403,
      message: `Review can be edited within ${REVIEW_EDIT_WINDOW_DAYS} days only.`,
    });
  }

  if ((review.editCount || 0) >= MAX_REVIEW_EDITS) {
    throw new ReviewServiceError({
      code: "REVIEW_EDIT_LIMIT_REACHED",
      status: 400,
      message: "Review can only be edited once.",
    });
  }
};

const mapDuplicateKeyError = (error) => {
  if (error?.code !== 11000) {
    return null;
  }

  return new ReviewServiceError({
    code: "REVIEW_DUPLICATE",
    status: 409,
    message: "A review already exists for this order and product.",
  });
};

const buildRatingSummary = async (productId) => {
  const summary = await Review.aggregate([
    {
      $match: {
        productId,
        isVerified: true,
        isHidden: false,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const byRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let weightedSum = 0;

  for (const row of summary) {
    const rating = Number(row._id);
    const count = Number(row.count || 0);

    if (rating >= 1 && rating <= 5) {
      byRating[rating] = count;
      total += count;
      weightedSum += rating * count;
    }
  }

  return {
    total,
    average: total > 0 ? Math.round((weightedSum / total) * 10) / 10 : 0,
    byRating,
  };
};

export const recalculateVerifiedProductRating = async (productIdValue) => {
  const productId = toObjectId(productIdValue, "productId");
  const summary = await buildRatingSummary(productId);

  await UniversalProduct.findByIdAndUpdate(productId, {
    averageRating: summary.average,
    totalReviews: summary.total,
  });

  return summary;
};

export const getReviewEligibility = async ({ userId: userIdValue, productId: productIdValue }) => {
  const userId = toObjectId(userIdValue, "userId");
  const productId = toObjectId(productIdValue, "productId");

  const completedOrders = await Order.find({
    status: ORDER_STATUS_COMPLETED,
    $or: [{ customerId: userId }, { userId }],
    "items.productId": productId,
  })
    .select("_id orderNumber createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (completedOrders.length === 0) {
    return {
      canReview: false,
      reason: "No COMPLETED order found for this product.",
      eligibleOrders: [],
      existingReviews: [],
    };
  }

  const orderIds = completedOrders.map((order) => order._id);

  const existingReviews = await Review.find({
    userId,
    productId,
    orderId: { $in: orderIds },
  })
    .select("_id orderId rating comment createdAt editCount")
    .sort({ createdAt: -1 })
    .lean();

  const reviewedOrderIds = new Set(existingReviews.map((review) => String(review.orderId)));

  const eligibleOrders = completedOrders.filter(
    (order) => !reviewedOrderIds.has(String(order._id))
  );

  return {
    canReview: eligibleOrders.length > 0,
    reason: eligibleOrders.length > 0 ? null : "All eligible orders already reviewed.",
    eligibleOrders,
    existingReviews,
  };
};

export const getVerifiedProductReviews = async ({
  productId: productIdValue,
  page = 1,
  limit = 20,
}) => {
  const productId = toObjectId(productIdValue, "productId");
  const normalizedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const normalizedLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 20, 1),
    100
  );

  const query = {
    productId,
    isVerified: true,
    isHidden: false,
  };

  const [total, reviews, summary] = await Promise.all([
    Review.countDocuments(query),
    Review.find(query)
      .populate("userId", "fullName avatar")
      .populate("orderId", "orderNumber")
      .sort({ createdAt: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean(),
    buildRatingSummary(productId),
  ]);

  return {
    reviews,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.max(Math.ceil(total / normalizedLimit), 1),
    },
    summary,
  };
};

export const createReview = async ({
  userId: userIdValue,
  productId: productIdValue,
  orderId: orderIdValue,
  rating,
  comment,
  images,
}) => {
  const userId = toObjectId(userIdValue, "userId");
  const productId = toObjectId(productIdValue, "productId");
  const orderId = toObjectId(orderIdValue, "orderId");
  const normalizedRating = normalizeRating(rating);
  const normalizedComment = normalizeComment(comment);
  const normalizedImages = normalizeImages(images);

  await Promise.all([
    ensureProductExists(productId),
    ensureReviewableOrder({ userId, productId, orderId }),
    ensureNoDuplicateReview({ userId, productId, orderId }),
  ]);

  let review;
  try {
    review = await Review.create({
      userId,
      productId,
      orderId,
      rating: normalizedRating,
      comment: normalizedComment,
      images: normalizedImages,
      isVerified: true,
    });
  } catch (error) {
    const duplicateError = mapDuplicateKeyError(error);
    if (duplicateError) {
      throw duplicateError;
    }
    throw error;
  }

  await recalculateVerifiedProductRating(productId);
  await review.populate("userId", "fullName avatar");
  await review.populate("orderId", "orderNumber");

  return review;
};

export const updateReview = async ({
  reviewId: reviewIdValue,
  userId: userIdValue,
  rating,
  comment,
  images,
}) => {
  const reviewId = toObjectId(reviewIdValue, "reviewId");
  const userId = toObjectId(userIdValue, "userId");

  const normalizedRating = normalizeRating(rating);
  const normalizedComment = normalizeComment(comment);
  const normalizedImages = images === undefined ? null : normalizeImages(images);

  const review = await Review.findById(reviewId);

  if (!review) {
    throw new ReviewServiceError({
      code: "REVIEW_NOT_FOUND",
      status: 404,
      message: "Review not found.",
    });
  }

  ensureCanEditReview({ review, userId });

  const hasRatingChanged = review.rating !== normalizedRating;
  const hasCommentChanged = review.comment !== normalizedComment;

  const currentImages = Array.isArray(review.images) ? review.images : [];
  const nextImages = normalizedImages ?? currentImages;
  const hasImagesChanged = JSON.stringify(currentImages) !== JSON.stringify(nextImages);

  if (!hasRatingChanged && !hasCommentChanged && !hasImagesChanged) {
    throw new ReviewServiceError({
      code: "REVIEW_NOTHING_TO_UPDATE",
      status: 400,
      message: "No changes detected.",
    });
  }

  const oldRating = review.rating;
  const oldComment = review.comment;
  const editedAt = new Date();

  review.rating = normalizedRating;
  review.comment = normalizedComment;
  review.images = nextImages;
  review.editCount = (review.editCount || 0) + 1;
  review.lastEditedAt = editedAt;

  await review.save();
  await ReviewHistory.create({
    reviewId: review._id,
    oldRating,
    oldComment,
    editedAt,
  });

  await recalculateVerifiedProductRating(review.productId);
  await review.populate("userId", "fullName avatar");
  await review.populate("orderId", "orderNumber");

  return review;
};

export default {
  ORDER_STATUS_COMPLETED,
  REVIEW_EDIT_WINDOW_DAYS,
  MAX_REVIEW_EDITS,
  getReviewEligibility,
  getVerifiedProductReviews,
  createReview,
  updateReview,
  recalculateVerifiedProductRating,
};
