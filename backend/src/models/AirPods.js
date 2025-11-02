// ============================================
// FILE: backend/src/models/AirPods.js
// ============================================

import mongoose from "mongoose";

// ============================================
// VARIANT SCHEMA
// ============================================
const airPodsVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],

    sku: { type: String, required: true, unique: true, trim: true }, // ✅ UPDATED: thêm trim

    // ✅ UPDATED: slug không unique, chỉ index và có trim
    slug: {
      type: String,
      required: true,
      sparse: true,
      trim: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AirPods",
      required: true,
      index: true, // ✅ UPDATED: thêm index cho tối ưu query
    },
  },
  { timestamps: true }
);

// ✅ UPDATED: kiểm tra logic giá
airPodsVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// ============================================
// MAIN AIRPODS SCHEMA
// ============================================
const airPodsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },

    // ✅ UPDATED: chuẩn hóa baseSlug
    baseSlug: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
    },

    // ✅ UPDATED: slug đồng bộ với baseSlug nếu chưa có
    slug: {
      type: String,
      sparse: true,
      trim: true,
    },

    description: { type: String, trim: true },

    specifications: {
      chip: { type: String, required: true, trim: true },
      batteryLife: { type: String, required: true, trim: true },
      waterResistance: { type: String, required: true, trim: true },
      bluetooth: { type: String, required: true, trim: true },
      additional: mongoose.Schema.Types.Mixed, // ✅ UPDATED: hỗ trợ mở rộng thông tin kỹ thuật
    },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "AirPodsVariant" }],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },

    brand: { type: String, default: "Apple", trim: true },

    category: {
      type: String,
      required: true,
      trim: true,
      default: "AirPods",
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
    },

    installmentBadge: {
      type: String,
      enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
      default: "NONE",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ============================================
// HOOKS
// ============================================

// ✅ UPDATED: tự động đồng bộ slug khi lưu
airPodsSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

// ============================================
// METHODS
// ============================================
airPodsSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ============================================
// INDEXES
// ============================================
airPodsSchema.index({ name: "text", model: "text", description: "text" });
airPodsSchema.index({ status: 1 });
airPodsSchema.index({ createdAt: -1 });
airPodsSchema.index({ salesCount: -1 });
airPodsSchema.index({ category: 1, salesCount: -1 });


// ============================================
// EXPORTS
// ============================================
export const AirPodsVariant = mongoose.model(
  "AirPodsVariant",
  airPodsVariantSchema
);

export default mongoose.model("AirPods", airPodsSchema);
