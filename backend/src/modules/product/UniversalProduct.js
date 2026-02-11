// ============================================
// FILE: backend/src/modules/product/UniversalProduct.js
// ✅ Schema tổng quát cho TẤT CẢ sản phẩm
// ============================================

import mongoose from "mongoose";

// VARIANT SCHEMA - CHỈ CÓ variantName
const universalVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, sparse: true, trim: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
      required: true,
      index: true,
    },
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} }, // Flexible attributes (storage, ram, etc.)
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Validation: giá bán <= giá gốc
universalVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

universalVariantSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

export const UniversalVariant = mongoose.model(
  "UniversalVariant",
  universalVariantSchema
);

// PRODUCT SCHEMA
const universalProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    baseSlug: { type: String, required: true, unique: true, sparse: true, trim: true },
    slug: { type: String, sparse: true, trim: true },
    description: { type: String, trim: true, default: "" },
    featuredImages: [{ type: String, trim: true }],
    videoUrl: { type: String, trim: true, default: "" },

    // BRAND & PRODUCT TYPE (Dynamic)
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    productType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductType",
      required: true,
    },

    // SPECS - Lưu dạng key-value động
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "UniversalVariant" }],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW", "USED"],
      default: "NEW",
      required: true,
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

// Auto-generate slug
universalProductSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

universalProductSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

universalProductSchema.index({ name: "text", model: "text", description: "text" });
universalProductSchema.index({ status: 1 });
universalProductSchema.index({ createdAt: -1 });
universalProductSchema.index({ salesCount: -1 });

export default mongoose.model("UniversalProduct", universalProductSchema);
