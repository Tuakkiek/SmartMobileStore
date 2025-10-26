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

appleWatchVariantSchema.pre("validate", function (next) {
  if (this.price > this.originalPrice) {
    next(new Error("Giá bán không thể lớn hơn giá gốc"));
  } else {
    next();
  }
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
    installmentBadge: {
      type: String,
      enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

appleWatchSchema.index({ name: "text", model: "text", description: "text" });
appleWatchSchema.index({ status: 1 });

export const AppleWatchVariant = mongoose.model(
  "AppleWatchVariant",
  appleWatchVariantSchema
);
export default mongoose.model("AppleWatch", appleWatchSchema);
