// backend/src/models/AppleWatch.js
import mongoose from "mongoose";

const appleWatchVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true }, // e.g., "GPS 40mm"
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppleWatch",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Validation: price <= originalPrice
appleWatchVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

const appleWatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    specifications: {
      screenSize: { type: String, required: true, trim: true },
      cpu: { type: String, required: true, trim: true },
      os: { type: String, required: true, trim: true },
      storage: { type: String, required: true, trim: true },
      batteryLife: { type: String, required: true, trim: true },
      colors: [{ type: String, trim: true }],
      brand: { type: String, default: "Apple", required: true, trim: true },
      features: { type: String, required: true, trim: true },
      healthFeatures: { type: String, required: true, trim: true },
    },
    variants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "AppleWatchVariant" },
    ],
    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },
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

    // ✅ THÊM: Lượt bán
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    // ✅ THÊM: Installment Badge
    installmentBadge: {
      type: String,
      enum: ["NONE", "INSTALLMENT_0", "INSTALLMENT_0_PREPAY_0"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

// ✅ THÊM: Method để cập nhật salesCount
appleWatchSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

appleWatchSchema.index({ name: "text", model: "text", description: "text" });
appleWatchSchema.index({ status: 1 });
appleWatchSchema.index({ salesCount: -1 }); // Sắp xếp theo lượt bán giảm dần
appleWatchSchema.index({ category: 1, salesCount: -1 }); // Query theo category + sales

export const AppleWatchVariant = mongoose.model(
  "AppleWatchVariant",
  appleWatchVariantSchema
);
export default mongoose.model("AppleWatch", appleWatchSchema);
