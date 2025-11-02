// ================================================
// FILE: models/IPhone.js
// ✅ UPDATED 2025: Bổ sung quản lý lượt bán (sales tracking)
// ================================================

import mongoose from "mongoose";

// ===============================
// VARIANT SCHEMA (Biến thể: màu + dung lượng)
// ===============================
const iPhoneVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],

    sku: { type: String, required: true, unique: true },
    slug: { type: String, required: true, sparse: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IPhone",
      required: true,
    },

    // ✅ MỚI: Theo dõi lượt bán cho từng biến thể
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ✅ Kiểm tra logic giá
iPhoneVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// ✅ MỚI: Tăng lượt bán cho từng variant
iPhoneVariantSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ===============================
// MAIN iPHONE SCHEMA
// ===============================
const iPhoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // iPhone 17 Pro Max
    model: { type: String, required: true, trim: true }, // ví dụ: A3101

    // ✅ Slug gốc, duy nhất cho toàn bộ model (vd: iphone-17-pro-max)
    baseSlug: { type: String, required: true, unique: true, sparse: true },

    slug: { type: String, sparse: true },

    description: { type: String, trim: true, default: "" },

    specifications: {
      chip: { type: String, required: true, trim: true },
      ram: { type: String, required: true, trim: true },
      storage: { type: String, required: true, trim: true },
      frontCamera: { type: String, required: true, trim: true },
      rearCamera: { type: String, required: true, trim: true },
      screenSize: { type: String, required: true, trim: true },
      screenTech: { type: String, required: true, trim: true },
      battery: { type: String, required: true, trim: true },
      os: { type: String, required: true, trim: true },
      colors: [{ type: String, trim: true }],
      additional: mongoose.Schema.Types.Mixed,
    },

    // ✅ Danh sách biến thể
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "IPhoneVariant" }],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },

    brand: { type: String, default: "Apple", trim: true },
    category: { type: String, required: true, trim: true, default: "iPhone" },

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

    // ✅ Thống kê
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },

    // ✅ Giữ lại tổng lượt bán của toàn bộ model
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ===============================
// HOOKS & METHODS
// ===============================

// ✅ Đồng bộ slug nếu thiếu
iPhoneSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
    console.log(`[iPhone Pre-save] Synced slug from baseSlug: ${this.slug}`);
  }
  next();
});

// ✅ CẬP NHẬT: Tăng lượt bán của model & variant đồng bộ
iPhoneSchema.methods.incrementSales = async function (variantId, quantity = 1) {
  // Tăng lượt bán tổng của model
  this.salesCount += quantity;
  await this.save();

  // Nếu có variantId -> tăng luôn lượt bán cho variant
  if (variantId) {
    const { IPhoneVariant } = mongoose.models;
    await IPhoneVariant.findByIdAndUpdate(variantId, {
      $inc: { salesCount: quantity },
    });
  }

  return this.salesCount;
};

// ===============================
// INDEXES
// ===============================

// ✅ Tối ưu tìm kiếm
iPhoneSchema.index({ name: "text", model: "text", description: "text" });

// ✅ Filter/sort
iPhoneSchema.index({ status: 1 });
iPhoneSchema.index({ createdAt: -1 });
iPhoneSchema.index({ salesCount: -1 });
iPhoneSchema.index({ category: 1, salesCount: -1 });

// ✅ Variant index
iPhoneVariantSchema.index({ productId: 1 });
iPhoneVariantSchema.index({ salesCount: -1 }); // mới thêm cho thống kê bán chạy

// ===============================
// EXPORT MODELS
// ===============================
export const IPhoneVariant = mongoose.model(
  "IPhoneVariant",
  iPhoneVariantSchema
);
export default mongoose.model("IPhone", iPhoneSchema);
