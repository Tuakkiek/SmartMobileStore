// ============================================
// FILE: models/Mac.js
// ✅ UPDATED 2025: Thêm quản lý lượt bán (sales tracking) và tối ưu an toàn cập nhật
// ============================================

import mongoose from "mongoose";

// ============================================
// VARIANT SCHEMA
// ============================================
const macVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    cpuGpu: { type: String, required: true, trim: true },
    ram: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true, trim: true },

    // Slug: KHÔNG unique, chỉ index
    slug: { type: String, required: true, sparse: true, trim: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mac",
      required: true,
    },

    // ✅ MỚI: Theo dõi lượt bán riêng cho từng biến thể
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ✅ Kiểm tra logic giá
macVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// ✅ MỚI: Hàm cập nhật lượt bán cho biến thể (dùng $inc để tránh conflict)
macVariantSchema.methods.incrementSales = async function (quantity = 1) {
  const updated = await this.constructor.findByIdAndUpdate(
    this._id,
    { $inc: { salesCount: quantity } },
    { new: true }
  );
  return updated.salesCount;
};

// ============================================
// MAIN MAC SCHEMA
// ============================================
const macSchema = new mongoose.Schema(
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

    specifications: {
      chip: { type: String, required: true, trim: true },
      gpu: { type: String, required: true, trim: true },
      ram: { type: String, required: true, trim: true },
      storage: { type: String, required: true, trim: true },
      screenSize: { type: String, required: true, trim: true },
      screenResolution: { type: String, required: true, trim: true },
      battery: { type: String, required: true, trim: true },
      os: { type: String, required: true, trim: true },
      colors: [{ type: String, trim: true }],
      additional: mongoose.Schema.Types.Mixed,
    },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "MacVariant" }],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },

    brand: { type: String, default: "Apple", trim: true },
    category: { type: String, default: "Mac", required: true, trim: true },

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

    // ✅ Tổng lượt bán của toàn bộ model
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ============================================
// HOOKS & METHODS
// ============================================

// ✅ Cập nhật slug tự động nếu thiếu
macSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
    console.log(`[Mac Pre-save] Synced slug from baseSlug: ${this.slug}`);
  }
  next();
});

// ✅ CẬP NHẬT: Hàm tăng lượt bán, đồng bộ cả product và variant
macSchema.methods.incrementSales = async function (variantId, quantity = 1) {
  // Atomic update để tránh ghi đè dữ liệu khi có nhiều request đồng thời
  await this.constructor.findByIdAndUpdate(
    this._id,
    { $inc: { salesCount: quantity } },
    { new: true }
  );

  if (variantId) {
    const { MacVariant } = mongoose.models;
    await MacVariant.findByIdAndUpdate(variantId, {
      $inc: { salesCount: quantity },
    });
  }

  const updated = await this.constructor.findById(this._id);
  return updated.salesCount;
};

// ============================================
// INDEXES
// ============================================

// ✅ Tối ưu tìm kiếm & sắp xếp
macSchema.index({ name: "text", model: "text", description: "text" });
macSchema.index({ status: 1 });
macSchema.index({ createdAt: -1 });
macSchema.index({ salesCount: -1 });
macSchema.index({ category: 1, salesCount: -1 });

// ✅ Variant indexes
macVariantSchema.index({ productId: 1 });
macVariantSchema.index({ salesCount: -1 }); // ✅ MỚI: Lọc biến thể bán chạy

// ============================================
// EXPORT MODELS
// ============================================
export const MacVariant = mongoose.model("MacVariant", macVariantSchema);
export default mongoose.model("Mac", macSchema);
