// models/Promotion.js
import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9]+$/,
      minlength: 4,
      maxlength: 15,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return v > this.startDate;
        },
        message: "Ngày kết thúc phải sau ngày bắt đầu",
      },
    },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

/* ========================================
   INSTANCE METHODS (dùng trong controller)
   ======================================== */

// Kiểm tra mã có đang hoạt động không (dùng trong applyPromotion)
promotionSchema.methods.isActive = function (orderTotal = 0) {
  const now = new Date();
  return (
    now >= this.startDate &&
    now <= this.endDate &&
    this.usedCount < this.usageLimit &&
    orderTotal >= this.minOrderValue
  );
};

// Áp dụng giảm giá (trả về tổng sau giảm)
promotionSchema.methods.applyDiscount = function (total) {
  if (!this.isActive(total)) {
    throw new Error(
      `Đơn hàng phải từ ${this.minOrderValue.toLocaleString()}₫ để áp dụng mã này.`
    );
  }

  if (this.discountType === "PERCENTAGE") {
    return Math.max(0, total * (1 - this.discountValue / 100));
  }
  return Math.max(0, total - this.discountValue);
};

// Tăng lượt sử dụng (dùng trong applyPromotion với transaction)
promotionSchema.methods.incrementUsage = async function () {
  this.usedCount += 1;
  await this.save();
};

/* ========================================
   INDEXES (tối ưu query)
   ======================================== */
promotionSchema.index({ startDate: 1, endDate: 1 }); // Query mã active
promotionSchema.index({ createdBy: 1 }); // Admin xem mã của mình

export default mongoose.model("Promotion", promotionSchema);