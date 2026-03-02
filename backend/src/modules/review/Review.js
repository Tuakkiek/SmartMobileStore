import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5.",
      },
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    editCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    lastEditedAt: {
      type: Date,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    adminReply: {
      content: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      repliedAt: {
        type: Date,
      },
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "product_reviews",
  }
);

// 1 order + 1 product + 1 user => only 1 review
reviewSchema.index(
  { userId: 1, productId: 1, orderId: 1 },
  {
    unique: true,
    name: "uniq_review_per_user_product_order",
  }
);

reviewSchema.index({ productId: 1, isVerified: 1, isHidden: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

const Review =
  mongoose.models.ProductReview || mongoose.model("ProductReview", reviewSchema);

export default Review;
