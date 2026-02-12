// ============================================
// FILE: backend/src/modules/warehouse/GoodsReceipt.js
// Quản lý phiếu nhập kho (GRN - Goods Receipt Note)
// ============================================

import mongoose from "mongoose";

const goodsReceiptSchema = new mongoose.Schema(
  {
    // Mã phiếu: GRN-2025-015
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Tham chiếu PO
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    poNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Nhà cung cấp
    supplier: {
      name: {
        type: String,
        required: true,
      },
      contact: {
        type: String,
      },
    },

    // Danh sách sản phẩm nhận
    items: [
      {
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
        orderedQuantity: {
          type: Number,
          required: true,
        },
        receivedQuantity: {
          type: Number,
          required: true,
        },
        damagedQuantity: {
          type: Number,
          default: 0,
        },
        locationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WarehouseLocation",
          required: true,
        },
        locationCode: {
          type: String,
          required: true,
        },
        qualityStatus: {
          type: String,
          enum: ["GOOD", "DAMAGED", "EXPIRED"],
          default: "GOOD",
        },
        unitPrice: {
          type: Number,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],

    // Tổng số lượng
    totalQuantity: {
      type: Number,
      required: true,
    },

    totalDamaged: {
      type: Number,
      default: 0,
    },

    // Người nhận hàng
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receivedByName: {
      type: String,
      required: true,
    },

    // Ngày nhận
    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Chữ ký người giao
    deliverySignature: {
      type: String, // Base64 image
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["COMPLETED", "CANCELLED"],
      default: "COMPLETED",
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
goodsReceiptSchema.index({ grnNumber: 1 });
goodsReceiptSchema.index({ purchaseOrderId: 1 });
goodsReceiptSchema.index({ receivedBy: 1 });
goodsReceiptSchema.index({ receivedDate: -1 });
goodsReceiptSchema.index({ createdAt: -1 });

export default mongoose.model("GoodsReceipt", goodsReceiptSchema);
