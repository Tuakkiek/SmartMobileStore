// ================================================
// FILE: backend/src/models/IPad.js
// ✅ REFACTORED: Kế thừa từ BaseProduct
// ================================================

import mongoose from "mongoose";
import { BaseProduct, BaseVariant } from "./BaseProduct.js";

// ===============================
// IPAD VARIANT SCHEMA
// ===============================
const iPadVariantSchema = new mongoose.Schema({
  storage: { type: String, required: true, trim: true },
  connectivity: { 
    type: String, 
    enum: ["WIFI", "5G"], 
    default: "WIFI" 
  },
});

export const IPadVariant = BaseVariant.discriminator(
  "IPadVariant",
  iPadVariantSchema
);

// ===============================
// IPAD PRODUCT SCHEMA
// ===============================
const iPadSpecificSchema = new mongoose.Schema({
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
});

const IPad = BaseProduct.discriminator("IPad", iPadSpecificSchema);
IPad.schema.path("category").default("iPad");

export default IPad;