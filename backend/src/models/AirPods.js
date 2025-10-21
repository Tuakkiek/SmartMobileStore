import mongoose from "mongoose";

const airPodsVariantSchema = new mongoose.Schema({
  color: { type: String, required: true, trim: true },
  variantName: { type: String, required: true, trim: true }, // e.g., "AirPods 4 Chống ồn"
  originalPrice: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: [{ type: String, trim: true }],
  sku: { type: String, required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "AirPods", required: true },
}, { timestamps: true });

const airPodsSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  specifications: {
    chip: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    batteryLife: { type: String, required: true, trim: true },
    waterResistance: { type: String, required: true, trim: true },
    bluetooth: { type: String, required: true, trim: true },
    additional: mongoose.Schema.Types.Mixed,
  },
  variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "AirPodsVariant" }],
  condition: { type: String, enum: ["NEW", "LIKE_NEW"], default: "NEW", required: true },
  brand: { type: String, default: "Apple", trim: true },
  status: { type: String, enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"], default: "AVAILABLE" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

airPodsSchema.index({ name: "text", model: "text", description: "text" });
airPodsSchema.index({ status: 1 });

export const AirPodsVariant = mongoose.model("AirPodsVariant", airPodsVariantSchema);
export default mongoose.model("AirPods", airPodsSchema);