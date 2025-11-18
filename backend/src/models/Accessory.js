// ============================================
// FILE: models/Accessory.js
// ✅ UPDATED 2025: Đồng bộ với chuẩn iPhone + thêm lượt bán cho Variant
// ============================================

import mongoose from "mongoose";

// ============================================
// VARIANT SCHEMA
// ============================================
const accessoryVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true },
    storage: { type: String, trim: true }, // ✅ ADDED
    connectivity: { type: String, trim: true }, // ✅ ADDED
    compatibility: { type: String, trim: true }, // ✅ ADDED
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },

    slug: {
      type: String,
      required: true,
      sparse: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accessory",
      required: true,
    },

    salesCount: { type: Number, default: 0, min: 0 }, // ✅ ADDED
  },
  { timestamps: true }
);

// ✅ Kiểm tra giá hợp lệ
accessoryVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không thể lớn hơn giá gốc"));
  }
  next();
});

// ✅ ADDED: Hàm tăng lượt bán cho từng biến thể
// accessoryVariantSchema.methods.incrementSales = async function (quantity = 1) {
//   this.salesCount += quantity;
//   await this.save();

//   // ✅ Đồng thời tăng lượt bán cho sản phẩm chính
//   const Accessory = mongoose.model("Accessory");
//   const parentProduct = await Accessory.findById(this.productId);
//   if (parentProduct) {
//     await parentProduct.incrementSales(quantity);
//   }

//   return this.salesCount;
// };

// ============================================
// MAIN ACCESSORY SCHEMA
// ============================================
const accessorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },

    baseSlug: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },

    slug: {
      type: String,
      sparse: true,
    },

    description: { type: String, trim: true },

    // ✅ UPDATED: mở rộng specifications
    specifications: {
      colors: [{ type: String, trim: true }],
      storages: [{ type: String, trim: true }], // ✅ ADDED
      compatibility: [{ type: String, trim: true }], // ✅ ADDED
      material: { type: String, trim: true }, // ✅ ADDED
      weight: { type: String, trim: true }, // ✅ ADDED
      dimensions: { type: String, trim: true }, // ✅ ADDED
      warranty: { type: String, trim: true }, // ✅ ADDED
      customSpecs: [
        {
          key: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
        },
      ],
    },

    variants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "AccessoryVariant" },
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
      default: "Accessory",
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

    salesCount: { type: Number, default: 0, min: 0 }, // ✅ ADDED
  },
  { timestamps: true }
);

// ============================================
// HOOKS
// ============================================
accessorySchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

// ✅ Hàm tăng lượt bán cho sản phẩm chính
accessorySchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ============================================
// INDEXES
// ============================================
accessorySchema.index({ name: "text", model: "text", description: "text" });
accessorySchema.index({ status: 1 });
accessorySchema.index({ createdAt: -1 });
accessorySchema.index({ salesCount: -1 });
accessorySchema.index({ category: 1, salesCount: -1 });
accessoryVariantSchema.index({ productId: 1 });

// ============================================
// EXPORT
// ============================================
export const AccessoryVariant = mongoose.model(
  "AccessoryVariant",
  accessoryVariantSchema
);
export default mongoose.model("Accessory", accessorySchema);
