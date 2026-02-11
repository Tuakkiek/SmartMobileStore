// ================================================
// FILE: backend/src/models/AirPods.js
// ✅ REFACTORED: Extends base schema (no discriminator)
// ================================================

import mongoose from "mongoose";
import {
  createBaseProductSchema,
  createBaseVariantSchema,
} from "./BaseProduct.js";

// ===============================
// AIRPODS VARIANT SCHEMA
// ===============================
const airPodsVariantSchema = createBaseVariantSchema();

airPodsVariantSchema.add({
  variantName: { type: String, required: true, trim: true },
});

airPodsVariantSchema.index({ salesCount: -1 });

export const AirPodsVariant = mongoose.model(
  "AirPodsVariant",
  airPodsVariantSchema,
  "airpodsvariants"
);

// ===============================
// AIRPODS PRODUCT SCHEMA
// ===============================
const airPodsSchema = createBaseProductSchema();

airPodsSchema.add({
  specifications: {
    chip: { type: String, required: true, trim: true },
    batteryLife: { type: String, required: true, trim: true },
    waterResistance: { type: String, required: true, trim: true },
    bluetooth: { type: String, required: true, trim: true },
    colors: [{ type: String, trim: true }],
    additional: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  variantModel: { type: String, default: "AirPodsVariant" },
});

airPodsSchema.path("productType").default("AirPods");
airPodsSchema.path("category").default("AirPods");

const AirPods = mongoose.model("AirPods", airPodsSchema, "airpods");

export default AirPods;
