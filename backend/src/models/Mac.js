// backend/src/models/Mac.js
import mongoose from "mongoose";

const macVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    cpuGpu: { type: String, required: true, trim: true }, // e.g., "10 CPU - 10 GPU"
    ram: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mac",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Validation: price <= originalPrice
macVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

const macSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, index: true }, // ✅ THÊM SLUG
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
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
    },
    // ✅ THÊM: Installment Badge
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

    // ✅ THÊM: Lượt bán
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ THÊM: Method để cập nhật salesCount
macSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

macSchema.index({ name: "text", model: "text", description: "text" });
macSchema.index({ status: 1 });
macSchema.index({ salesCount: -1 }); // Sắp xếp theo lượt bán giảm dần
macSchema.index({ category: 1, salesCount: -1 }); // Query theo category + sales

export const MacVariant = mongoose.model("MacVariant", macVariantSchema);
export default mongoose.model("Mac", macSchema);
