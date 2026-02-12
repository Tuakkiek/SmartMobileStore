// ============================================
// FILE: backend/src/modules/warehouse/StockMovement.js
// Ghi log mọi hoạt động nhập/xuất/chuyển kho
// ============================================

import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    // Loại giao dịch
    type: {
      type: String,
      enum: ["INBOUND", "OUTBOUND", "TRANSFER", "ADJUSTMENT"],
      required: true,
    },

    // SKU sản phẩm
    sku: {
      type: String,
      required: true,
      trim: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    // Vị trí nguồn (null nếu là INBOUND)
    fromLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarehouseLocation",
    },

    fromLocationCode: {
      type: String,
      trim: true,
    },

    // Vị trí đích (null nếu là OUTBOUND)
    toLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarehouseLocation",
    },

    toLocationCode: {
      type: String,
      trim: true,
    },

    // Số lượng
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    // Tham chiếu đơn hàng
    referenceType: {
      type: String,
      enum: ["PO", "ORDER", "TRANSFER", "CYCLE_COUNT", "MANUAL"],
    },

    referenceId: {
      type: String,
      trim: true,
    },

    // Người thực hiện
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    performedByName: {
      type: String,
      required: true,
    },

    // Trạng thái chất lượng
    qualityStatus: {
      type: String,
      enum: ["GOOD", "DAMAGED", "EXPIRED"],
      default: "GOOD",
    },

    // Ghi chú
    notes: {
      type: String,
      trim: true,
    },

    // Chữ ký (cho nhận hàng từ NCC)
    signature: {
      type: String, // Base64 image
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ sku: 1 });
stockMovementSchema.index({ referenceId: 1 });
stockMovementSchema.index({ performedBy: 1 });
stockMovementSchema.index({ createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);
