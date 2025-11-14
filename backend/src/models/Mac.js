// ================================================
// FILE: backend/src/models/Mac.js
// ✅ REFACTORED: Extends base schema (no discriminator)
// ================================================

import mongoose from "mongoose";
import {
  createBaseProductSchema,
  createBaseVariantSchema,
} from "./BaseProduct.js";

// ===============================
// MAC VARIANT SCHEMA
// ===============================
const macVariantSchema = createBaseVariantSchema();

macVariantSchema.add({
  cpuGpu: { type: String, required: true, trim: true },
  ram: { type: String, required: true, trim: true },
  storage: { type: String, required: true, trim: true },
});



export const MacVariant = mongoose.model(
  "MacVariant",
  macVariantSchema,
  "macvariants"
);

// ===============================
// MAC PRODUCT SCHEMA
// ===============================
const macSchema = createBaseProductSchema();

macSchema.add({
  specifications: {
    chip: { type: String, required: true, trim: true },
    gpu: { type: String, required: true, trim: true },
    ram: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    screenSize: { type: String, required: true, trim: true },
    screenResolution: { type: String, required: true, trim: true },
    battery: { type: String, required: true, trim: true },
    os: { type: String, required: true, trim: true },
    colors: [{ type: String, trim: true }],
    additional: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  variantModel: { type: String, default: "MacVariant" },
});

macSchema.path("category").default("Mac");

const Mac = mongoose.model("Mac", macSchema, "macs");

export default Mac;
