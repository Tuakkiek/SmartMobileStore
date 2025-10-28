// backend/src/models/Accessory.js
import mongoose from "mongoose";

const accessoryVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true }, // e.g., "Smart Folio 11 inch"
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accessory",
      required: true,
    },
  },
  { timestamps: true }
);

accessoryVariantSchema.pre("validate", function (next) {
  if (this.price > this.originalPrice) {
    next(new Error("Giá bán không thể lớn hơn giá gốc"));
  } else {
    next();
  }
});

const accessorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    specifications: {
      colors: [{ type: String, trim: true }],
      customSpecs: [
        {
          key: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
        },
      ],
    },

    // ✅ THÊM: Lượt bán
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
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
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    // ✅ THÊM: Installment Badge
    installmentBadge: {
      type: String,
      enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

// ✅ THÊM: Method để cập nhật salesCount
accessorySchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

accessorySchema.index({ name: "text", model: "text", description: "text" });
accessorySchema.index({ status: 1 });
accessorySchema.index({ salesCount: -1 }); // Sắp xếp theo lượt bán giảm dần
accessorySchema.index({ category: 1, salesCount: -1 }); // Query theo category + sales

export const AccessoryVariant = mongoose.model(
  "AccessoryVariant",
  accessoryVariantSchema
);
export default mongoose.model("Accessory", accessorySchema);
