// backend/src/models/IPhone.js
import mongoose from "mongoose";

const iPhoneVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      sparse: true, // ✅ Cho phép null nhưng unique khi có giá trị
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IPhone",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Validation: price <= originalPrice
iPhoneVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

const iPhoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },

    // ✅ Slug gốc (không có storage) - index unique
    baseSlug: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true,
    },

    // ✅ Slug legacy (tương thích với frontend cũ) - KHÔNG unique, chỉ index
    slug: {
      type: String,
      index: true,
      sparse: true,
    },

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

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },
  },
  { timestamps: true }
);

// ✅ Pre-save hook: Đồng bộ slug từ baseSlug
iPhoneSchema.pre("save", function (next) {
  // Nếu có baseSlug nhưng chưa có slug → đồng bộ
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
    console.log(`[iPhone Pre-save] Synced slug from baseSlug: ${this.slug}`);
  }
  next();
});

// ✅ Method để cập nhật salesCount
iPhoneSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ✅ Indexes
iPhoneSchema.index({ name: "text", model: "text", description: "text" });
iPhoneSchema.index({ status: 1 });
iPhoneSchema.index({ createdAt: -1 });
iPhoneSchema.index({ salesCount: -1 });
iPhoneSchema.index({ category: 1, salesCount: -1 });
iPhoneSchema.index({ baseSlug: 1 }, { unique: true, sparse: true });
iPhoneSchema.index({ slug: 1 }, { sparse: true }); // Không unique

// ✅ Variant indexes
iPhoneVariantSchema.index({ productId: 1 });
iPhoneVariantSchema.index({ sku: 1 }, { unique: true });
iPhoneVariantSchema.index({ slug: 1 }, { unique: true, sparse: true });

export const IPhoneVariant = mongoose.model(
  "IPhoneVariant",
  iPhoneVariantSchema
);
export default mongoose.model("IPhone", iPhoneSchema);
