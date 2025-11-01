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
    slug: {
      type: String,
      required: true,
       
      sparse: true,
      trim: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mac",
      required: true,
       
    },
  },
  { timestamps: true }
);

// Validation
macVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

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

    slug: {
      type: String,
       
      sparse: true,
      trim: true,
    },

    description: { type: String, trim: true },

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
    salesCount: { type: Number, default: 0, min: 0   },
  },
  { timestamps: true }
);

// Pre-save: sync slug
macSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
  }
  next();
});

// Method
macSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// Indexes
macSchema.index({ name: "text", model: "text", description: "text" });
macSchema.index({ status: 1 });
macSchema.index({ createdAt: -1 });
macSchema.index({ salesCount: -1 });
macSchema.index({ category: 1, salesCount: -1 });


// Variant indexes
macVariantSchema.index({ productId: 1 });


export const MacVariant = mongoose.model("MacVariant", macVariantSchema);
export default mongoose.model("Mac", macSchema);
