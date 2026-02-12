// ============================================
// FILE: backend/src/modules/warehouse/Inventory.js
// Quản lý tồn kho theo từng vị trí và SKU
// ============================================

import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    // SKU sản phẩm (reference to UniversalProduct.variants)
    sku: {
      type: String,
      required: true,
      trim: true,
    },

    // Thông tin sản phẩm (cached for performance)
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    // Vị trí lưu kho
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarehouseLocation",
      required: true,
    },

    locationCode: {
      type: String,
      required: true,
    },

    // Số lượng tồn kho tại vị trí này
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Thông tin nhập kho
    lastReceived: {
      type: Date,
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["GOOD", "DAMAGED", "EXPIRED", "RESERVED"],
      default: "GOOD",
    },

    // Ghi chú
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
inventorySchema.index({ sku: 1 });
inventorySchema.index({ locationId: 1 });
inventorySchema.index({ sku: 1, locationId: 1 }, { unique: true });
inventorySchema.index({ productId: 1 });
inventorySchema.index({ status: 1 });

export default mongoose.model("Inventory", inventorySchema);
