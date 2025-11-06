// ================================================
// FILE: backend/src/models/IPhone.js
// ✅ REFACTORED: Kế thừa từ BaseProduct
// ================================================

import mongoose from "mongoose";
import { BaseProduct, BaseVariant } from "./BaseProduct.js";

// ===============================
// IPHONE VARIANT SCHEMA - Kế thừa BaseVariant
// ===============================
const iPhoneVariantSchema = new mongoose.Schema({
  storage: { type: String, required: true, trim: true }, // Riêng cho iPhone
});

// Create discriminator
export const IPhoneVariant = BaseVariant.discriminator(
  "IPhoneVariant",
  iPhoneVariantSchema
);

// ===============================
// IPHONE PRODUCT SCHEMA - Kế thừa BaseProduct
// ===============================
const iPhoneSpecificSchema = new mongoose.Schema({
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
});

// Create discriminator với default category
const IPhone = BaseProduct.discriminator("IPhone", iPhoneSpecificSchema);

// Override category default
IPhone.schema.path("category").default("iPhone");

// ===============================
// EXPORT
// ===============================
export default IPhone;