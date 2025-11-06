// ============================================
// FILE: backend/src/models/BaseProduct.js
// ✅ BASE MODEL - Chứa thông tin chung cho tất cả sản phẩm
// ============================================

import mongoose from "mongoose";

// ============================================
// BASE VARIANT SCHEMA (ABSTRACT)
// ============================================
const baseVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, sparse: true, trim: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BaseProduct",
      required: true,
      index: true,
    },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { 
    timestamps: true,
    discriminatorKey: "productType" // Để phân biệt iPhone/iPad/Mac variant
  }
);

// Validation: giá bán <= giá gốc
baseVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// Method: Tăng lượt bán cho variant
baseVariantSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ============================================
// BASE PRODUCT SCHEMA
// ============================================
const baseProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    
    baseSlug: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
    },
    
    slug: { type: String, sparse: true, trim: true },
    
    description: { type: String, trim: true, default: "" },
    
    // Specifications chung - các model con sẽ override/extend
    specifications: {
      chip: { type: String, trim: true },
      ram: { type: String, trim: true },
      storage: { type: String, trim: true },
      screenSize: { type: String, trim: true },
      screenTech: { type: String, trim: true },
      battery: { type: String, trim: true },
      os: { type: String, trim: true },
      colors: [{ type: String, trim: true }],
      // Flexible field để mỗi model thêm specs riêng
      additional: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    
    variants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "BaseVariant" }
    ],
    
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
      enum: ["iPhone", "iPad", "Mac", "AirPods", "Apple Watch"],
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
  {
    timestamps: true,
    discriminatorKey: "productType", // Để phân biệt iPhone/iPad/Mac
  }
);

// ============================================
// HOOKS
// ============================================

// Tự động đồng bộ slug từ baseSlug
baseProductSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

// ============================================
// METHODS
// ============================================

// Tăng lượt bán cho product
baseProductSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// Tính giá thấp nhất từ variants
baseProductSchema.methods.getMinPrice = async function () {
  if (!this.variants || this.variants.length === 0) return 0;
  
  await this.populate("variants");
  const prices = this.variants.map(v => v.price).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
};

// ============================================
// INDEXES
// ============================================
baseProductSchema.index({ name: "text", model: "text", description: "text" });
baseProductSchema.index({ status: 1 });
baseProductSchema.index({ createdAt: -1 });
baseProductSchema.index({ salesCount: -1 });
baseProductSchema.index({ category: 1, salesCount: -1 });

baseVariantSchema.index({ salesCount: -1 });

// ============================================
// CREATE BASE MODELS (KHÔNG DÙNG TRỰC TIẾP)
// ============================================
export const BaseVariant = mongoose.model("BaseVariant", baseVariantSchema);
export const BaseProduct = mongoose.model("BaseProduct", baseProductSchema);

export default BaseProduct;