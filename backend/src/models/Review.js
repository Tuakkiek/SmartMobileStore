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
    // ✅ THÊM: Lưu orderId để verify đã mua
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
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
      maxlength: 3000,
    },
    // ✅ CẬP NHẬT: Cho phép nhiều ảnh
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    // ✅ THÊM: Đánh dấu đã mua và xác minh
    purchaseVerified: {
      type: Boolean,
      default: false,
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
  }
);

// ✅ CẬP NHẬT INDEX: Thêm orderId
reviewSchema.index({ productId: 1, customerId: 1, orderId: 1 });
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ purchaseVerified: 1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
