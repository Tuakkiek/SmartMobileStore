// ================================================
// FILE: backend/src/models/AirPods.js
// ✅ REFACTORED: Kế thừa từ BaseProduct
// ================================================

import mongoose from "mongoose";
import { BaseProduct, BaseVariant } from "./BaseProduct.js";

// ===============================
// AIRPODS VARIANT SCHEMA
// ===============================
const airPodsVariantSchema = new mongoose.Schema({
  variantName: { type: String, required: true, trim: true },
});

export const AirPodsVariant = BaseVariant.discriminator(
  "AirPodsVariant",
  airPodsVariantSchema
);

// ===============================
// AIRPODS PRODUCT SCHEMA
// ===============================
const airPodsSpecificSchema = new mongoose.Schema({
  specifications: {
    chip: { type: String, required: true, trim: true },
    batteryLife: { type: String, required: true, trim: true },
    waterResistance: { type: String, required: true, trim: true },
    bluetooth: { type: String, required: true, trim: true },
    colors: [{ type: String, trim: true }],
    additional: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
});

const AirPods = BaseProduct.discriminator("AirPods", airPodsSpecificSchema);
AirPods.schema.path("category").default("AirPods");

export default AirPods;
