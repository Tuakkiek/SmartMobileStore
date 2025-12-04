// ============================================
// FILE: backend/src/models/ShortVideo.js
// Schema for short videos (TikTok/Reels style)
// ============================================

import mongoose from "mongoose";

const shortVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề video không được để trống"],
      trim: true,
      maxlength: [100, "Tiêu đề không quá 100 ký tự"],
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Mô tả không quá 500 ký tự"],
    },

    videoUrl: {
      type: String,
      required: [true, "URL video không được để trống"],
      trim: true,
    },

    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      type: Number, // seconds
      required: true,
      min: [1, "Thời lượng tối thiểu 1 giây"],
      max: [180, "Thời lượng tối đa 180 giây (3 phút)"],
    },

    // Liên kết sản phẩm (nếu có)
    linkedProducts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "linkedProducts.productType",
        },
        productType: {
          type: String,
          enum: ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"],
        },
        productName: String,
        productImage: String,
      },
    ],

    // Analytics
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    likes: {
      type: Number,
      default: 0,
      min: 0,
    },

    shares: {
      type: Number,
      default: 0,
      min: 0,
    },

    // User interactions
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "PUBLISHED",
    },

    // Display order (lower = higher priority)
    order: {
      type: Number,
      default: 0,
    },

    // Creator info
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================
shortVideoSchema.index({ status: 1, order: 1, publishedAt: -1 });
shortVideoSchema.index({ views: -1 });
shortVideoSchema.index({ likes: -1 });
shortVideoSchema.index({ createdBy: 1 });

// ============================================
// METHODS
// ============================================

// Increment view count
shortVideoSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Toggle like
shortVideoSchema.methods.toggleLike = function (userId) {
  const index = this.likedBy.indexOf(userId);
  
  if (index > -1) {
    // Unlike
    this.likedBy.splice(index, 1);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    // Like
    this.likedBy.push(userId);
    this.likes += 1;
  }
  
  return this.save();
};

// Increment share count
shortVideoSchema.methods.incrementShares = function () {
  this.shares += 1;
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

// Get published videos (for public)
shortVideoSchema.statics.getPublished = function (limit = 50, skip = 0) {
  return this.find({ status: "PUBLISHED" })
    .sort({ order: 1, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "fullName avatar")
    .lean();
};

// Get trending videos (high views/likes in last 7 days)
shortVideoSchema.statics.getTrending = function (limit = 20) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: "PUBLISHED",
    publishedAt: { $gte: sevenDaysAgo },
  })
    .sort({ views: -1, likes: -1 })
    .limit(limit)
    .populate("createdBy", "fullName avatar")
    .lean();
};

const ShortVideo = mongoose.model("ShortVideo", shortVideoSchema);

export default ShortVideo;