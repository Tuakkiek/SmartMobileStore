// ============================================
// FILE: backend/src/models/AppleWatch.js
// ============================================

import mongoose from "mongoose";

// ============================================
// VARIANT SCHEMA
// ============================================
const appleWatchVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],

    sku: { type: String, required: true, unique: true, trim: true }, // ✅ UPDATED: thêm trim để chuẩn hóa

    // ✅ UPDATED: slug không unique, chỉ index
    slug: {
      type: String,
      required: true,
      sparse: true,
      trim: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppleWatch",
      required: true,
      index: true, // ✅ UPDATED: thêm index cho tối ưu truy vấn
    },
  },
  { timestamps: true }
);

// ✅ UPDATED: validation logic
appleWatchVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// ============================================
// MAIN SCHEMA
// ============================================
const appleWatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },

    // ✅ UPDATED: baseSlug unique và sparse
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
      screenSize: { type: String, required: true, trim: true },
      cpu: { type: String, required: true, trim: true },
      os: { type: String, required: true, trim: true },
      storage: { type: String, required: true, trim: true },
      batteryLife: { type: String, required: true, trim: true },
      colors: [{ type: String, trim: true }],
      features: { type: String, required: true, trim: true },
      healthFeatures: { type: String, required: true, trim: true },

      // ✅ UPDATED: hỗ trợ thêm field mở rộng (tùy sản phẩm)
      additional: mongoose.Schema.Types.Mixed,
    },

    variants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "AppleWatchVariant" },
    ],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },

    brand: { type: String, default: "Apple", trim: true }, // ✅ UPDATED: thêm brand chuẩn hóa

    category: {
      type: String,
      required: true,
      trim: true,
      default: "Apple Watch",
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

// ✅ UPDATED: tự động đồng bộ slug nếu chưa có
appleWatchSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

// ============================================
// METHODS
// ============================================
appleWatchSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ============================================
// INDEXES
// ============================================
appleWatchSchema.index({ name: "text", model: "text", description: "text" });
appleWatchSchema.index({ status: 1 });
appleWatchSchema.index({ createdAt: -1 });
appleWatchSchema.index({ salesCount: -1 });
appleWatchSchema.index({ category: 1, salesCount: -1 });


// ============================================
// EXPORTS
// ============================================
export const AppleWatchVariant = mongoose.model(
  "AppleWatchVariant",
  appleWatchVariantSchema
);

export default mongoose.model("AppleWatch", appleWatchSchema);
