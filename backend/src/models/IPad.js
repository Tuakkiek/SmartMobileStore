// ================================================
// FILE: backend/src/models/IPad.js
// ✅ REFACTORED: Extends base schema (no discriminator)
// ================================================

import mongoose from "mongoose";
import { createBaseProductSchema, createBaseVariantSchema } from "./BaseProduct.js";

// ===============================
// IPAD VARIANT SCHEMA
// ===============================
const iPadVariantSchema = createBaseVariantSchema();

iPadVariantSchema.add({
  storage: { type: String, required: true, trim: true },
  connectivity: { 
    type: String, 
    enum: ["WIFI", "5G"], 
    default: "WIFI" 
  },
});

iPadVariantSchema.index({ salesCount: -1 });

export const IPadVariant = mongoose.model(
  "IPadVariant",
  iPadVariantSchema,
  "ipadvariants"
);

// ===============================
// IPAD PRODUCT SCHEMA
// ===============================
const iPadSchema = createBaseProductSchema();

iPadSchema.add({
  specifications: {
    chip: { type: String, trim: true },
    ram: { type: String, trim: true },
    storage: { type: String, trim: true },
    frontCamera: { type: String, trim: true },
    rearCamera: { type: String, trim: true },
    screenSize: { type: String, trim: true },
    screenTech: { type: String, trim: true },
    battery: { type: String, trim: true },
    os: { type: String, trim: true },
    colors: [{ type: String, trim: true }],
    additional: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  variantModel: { type: String, default: "IPadVariant" },
});

iPadSchema.path("category").default("iPad");

const IPad = mongoose.model("IPad", iPadSchema, "ipads");

export default IPad;