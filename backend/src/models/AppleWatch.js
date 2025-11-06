// ================================================
// FILE: backend/src/models/AppleWatch.js
// ✅ REFACTORED: Kế thừa từ BaseProduct
// ================================================

import mongoose from "mongoose";
import { BaseProduct, BaseVariant } from "./BaseProduct.js";

// ===============================
// APPLE WATCH VARIANT SCHEMA
// ===============================
const appleWatchVariantSchema = new mongoose.Schema({
  variantName: { type: String, required: true, trim: true },
});

export const AppleWatchVariant = BaseVariant.discriminator(
  "AppleWatchVariant",
  appleWatchVariantSchema
);

// ===============================
// APPLE WATCH PRODUCT SCHEMA
// ===============================
const appleWatchSpecificSchema = new mongoose.Schema({
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
});

const AppleWatch = BaseProduct.discriminator(
  "AppleWatch",
  appleWatchSpecificSchema
);
AppleWatch.schema.path("category").default("Apple Watch");

export default AppleWatch;
