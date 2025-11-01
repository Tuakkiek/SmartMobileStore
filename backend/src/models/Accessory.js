import mongoose from "mongoose";

const accessoryVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true },
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
  },
  { timestamps: true }
);

accessoryVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không thể lớn hơn giá gốc"));
  }
  next();
});

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
    specifications: {
      colors: [{ type: String, trim: true }],
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
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

accessorySchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

accessorySchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

accessorySchema.index({ name: "text", model: "text", description: "text" });
accessorySchema.index({ status: 1 });
accessorySchema.index({ createdAt: -1 });
accessorySchema.index({ salesCount: -1 });
accessorySchema.index({ category: 1, salesCount: -1 });


// Variant indexes
accessoryVariantSchema.index({ productId: 1 });

export const AccessoryVariant = mongoose.model(
  "AccessoryVariant",
  accessoryVariantSchema
);
export default mongoose.model("Accessory", accessorySchema);
