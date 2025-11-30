// ================================================
// FILE: backend/src/models/IPhone.js
// ✅ REFACTORED: Extends base schema (no discriminator)
// ================================================

import mongoose from "mongoose";
import {
  createBaseProductSchema,
  createBaseVariantSchema,
} from "./BaseProduct.js";

// ===============================
// IPHONE VARIANT SCHEMA
// ===============================
const iPhoneVariantSchema = createBaseVariantSchema();

// Add iPhone-specific variant fields
iPhoneVariantSchema.add({
  storage: { type: String, required: true, trim: true },
});


export const IPhoneVariant = mongoose.model(
  "IPhoneVariant",
  iPhoneVariantSchema,
  "iphonevariants" // Explicit collection name
);

// ===============================
// IPHONE PRODUCT SCHEMA
// ===============================
const iPhoneSchema = createBaseProductSchema();

// Override specifications for iPhone
iPhoneSchema.add({
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
    additional: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  // Set default variantModel for refPath
  variantModel: { type: String, default: "IPhoneVariant" },
});

// Override category default
iPhoneSchema.path("productType").default("iPhone");
iPhoneSchema.path("category").default("iPhone");

// Create model with explicit collection name
const IPhone = mongoose.model("IPhone", iPhoneSchema, "iphones");

// ===============================
// EXPORT
// ===============================
export default IPhone;
