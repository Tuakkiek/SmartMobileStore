// backend/src/models/AppleWatch.js
import mongoose from "mongoose";

const appleWatchVariantSchema = new mongoose.Schema({
  color: { type: String, required: true, trim: true },
  variantName: { type: String, required: true, trim: true }, // e.g., "GPS 40mm"
  bandSize: { type: String, required: true, trim: true },
  originalPrice: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: [{ type: String, trim: true }],
  sku: { type: String, required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "AppleWatch", required: true },
}, { timestamps: true });

const appleWatchSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  specifications: {
    batteryLife: { type: String, required: true, trim: true },
    compatibility: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    screenTech: { type: String, required: true, trim: true },
    calling: { type: String, required: true, trim: true },
    healthFeatures: { type: String, required: true, trim: true },
    additional: mongoose.Schema.Types.Mixed,
  },
  variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "AppleWatchVariant" }],
  condition: { type: String, enum: ["NEW", "LIKE_NEW"], default: "NEW", required: true },
  brand: { type: String, default: "Apple", trim: true },
  status: { type: String, enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"], default: "AVAILABLE" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

appleWatchSchema.index({ name: "text", model: "text", description: "text" });
appleWatchSchema.index({ status: 1 });

export const AppleWatchVariant = mongoose.model("AppleWatchVariant", appleWatchVariantSchema);
export default mongoose.model("AppleWatch", appleWatchSchema);