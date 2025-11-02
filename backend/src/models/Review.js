// ============================================
// FILE: backend/src/models/Review.js
// ============================================

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "productModel",
    },
    productModel: {
      type: String,
      required: true,
      enum: ["IPhone", "IPad", "Mac", "AirPods", "AppleWatch", "Accessory"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    images: [
      {
        type: String,
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    unhelpful: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;