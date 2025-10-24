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
  },
  { timestamps: true }
);

accessorySchema.index({ name: "text", model: "text", description: "text" });
accessorySchema.index({ status: 1 });

export const AccessoryVariant = mongoose.model(
  "AccessoryVariant",
  accessoryVariantSchema
);
export default mongoose.model("Accessory", accessorySchema);
