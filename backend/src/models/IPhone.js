// backend/src/models/IPad.js
import mongoose from "mongoose";

const iPhoneVariantSchema = new mongoose.Schema({
  color: { type: String, required: true, trim: true },
  storage: { type: String, required: true, trim: true },
  originalPrice: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: [{ type: String, trim: true }],
  sku: { type: String, required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "IPhone", required: true },
}, { timestamps: true });

const iPhoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  specifications: {
    chip: { type: String, required: true, trim: true },
    ram: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    frontCamera: { type: String, required: true, trim: true },
    rearCamera: { type: String, required: true, trim: true },
    screenSize: { type: String, required: true, trim: true },
    screenTech: { type: String, required: true, trim: true },
    battery: { type: String, required: true, trim: true },
    os: { type: String, required: true, trim: true },
    colors: [{ type: String, trim: true }],
    additional: mongoose.Schema.Types.Mixed,
  },
  variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "IPhoneVariant" }],
  condition: { type: String, enum: ["NEW", "LIKE_NEW"], default: "NEW", required: true },
  brand: { type: String, default: "Apple", trim: true },
  status: { type: String, enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"], default: "AVAILABLE" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

iPhoneSchema.index({ name: "text", model: "text", description: "text" });
iPhoneSchema.index({ status: 1 });

export const IPhoneVariant = mongoose.model("IPhoneVariant", iPhoneVariantSchema);
export default mongoose.model("IPhone", iPhoneSchema);