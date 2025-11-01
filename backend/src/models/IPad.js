import mongoose from "mongoose";

const iPadVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    connectivity: { type: String, enum: ["WIFI", "5G"], default: "WIFI" },
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
      ref: "IPad",
      required: true,
       
    },
  },
  { timestamps: true }
);

iPadVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

const iPadSchema = new mongoose.Schema(
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
      chip: { type: String, trim: true },
      ram: { type: String, trim: true },
      storage: { type: String, trim: true },
      frontCamera: { type: String, trim: true },
      rearCamera: { type: String, trim: true },
      screenSize: { type: String, trim: true },
      screenTech: { type: String, trim: true },
      battery: { type: String, trim: true },
      os: { type: String, trim: true },
      colors: [{ type: String, trim: true }],
      additional: mongoose.Schema.Types.Mixed,
    },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "IPadVariant" }],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },
    brand: { type: String, default: "Apple", trim: true },
    category: { type: String, required: true, trim: true, default: "iPad" },
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

iPadSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

iPadSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

iPadSchema.index({ name: "text", model: "text", description: "text" });
iPadSchema.index({ status: 1 });
iPadSchema.index({ createdAt: -1 });
iPadSchema.index({ salesCount: -1 });
iPadSchema.index({ category: 1, salesCount: -1 });


// Variant indexes
iPadVariantSchema.index({ productId: 1 });


export const IPadVariant = mongoose.model("IPadVariant", iPadVariantSchema);
export default mongoose.model("IPad", iPadSchema);
