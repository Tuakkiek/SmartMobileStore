// ================================================
// FILE: backend/src/models/Mac.js
// ✅ REFACTORED: Kế thừa từ BaseProduct
// ================================================

import mongoose from "mongoose";
import { BaseProduct, BaseVariant } from "./BaseProduct.js";

// ===============================
// MAC VARIANT SCHEMA
// ===============================
const macVariantSchema = new mongoose.Schema({
  cpuGpu: { type: String, required: true, trim: true },
  ram: { type: String, required: true, trim: true },
  storage: { type: String, required: true, trim: true },
});

export const MacVariant = BaseVariant.discriminator(
  "MacVariant",
  macVariantSchema
);

// ===============================
// MAC PRODUCT SCHEMA
// ===============================
const macSpecificSchema = new mongoose.Schema({
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
});

const Mac = BaseProduct.discriminator("Mac", macSpecificSchema);
Mac.schema.path("category").default("Mac");

export default Mac;