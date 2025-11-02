// models/PromotionUsage.js
import mongoose from "mongoose";

const promotionUsageSchema = new mongoose.Schema(
  {
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    orderTotal: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    usedAt: {
      type: Date,
      default: Date.now, // ← SỬA: KHÔNG CÓ ()
    },
  },
  { timestamps: true }
);

// Đảm bảo 1 user chỉ dùng 1 mã 1 lần
promotionUsageSchema.index({ promotion: 1, user: 1 }, { unique: true });

export default mongoose.model("PromotionUsage", promotionUsageSchema);