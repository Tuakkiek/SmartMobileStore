// ================================================
// FILE: backend/src/models/AppleWatch.js
// ✅ REFACTORED: Extends base schema (no discriminator)
// ================================================

import mongoose from "mongoose";
import { createBaseProductSchema, createBaseVariantSchema } from "./BaseProduct.js";

// ===============================
// APPLE WATCH VARIANT SCHEMA
// ===============================
const appleWatchVariantSchema = createBaseVariantSchema();

appleWatchVariantSchema.add({
  variantName: { type: String, required: true, trim: true },
});

appleWatchVariantSchema.index({ salesCount: -1 });

export const AppleWatchVariant = mongoose.model(
  "AppleWatchVariant",
  appleWatchVariantSchema,
  "applewatchvariants"
);

// ===============================
// APPLE WATCH PRODUCT SCHEMA
// ===============================
const appleWatchSchema = createBaseProductSchema();

appleWatchSchema.add({
  specifications: {
    screenSize: { type: String, required: true, trim: true },
    cpu: { type: String, required: true, trim: true },
    os: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    batteryLife: { type: String, required: true, trim: true },
    features: { type: String, required: true, trim: true },
    healthFeatures: { type: String, required: true, trim: true },
    colors: [{ type: String, trim: true }],
    additional: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  variantModel: { type: String, default: "AppleWatchVariant" },
});

appleWatchSchema.path("productType").default("Apple Watch");
appleWatchSchema.path("category").default("Apple Watch");


const AppleWatch = mongoose.model("AppleWatch", appleWatchSchema, "applewatches");

export default AppleWatch;