// ============================================
// FILE: backend/src/modules/warehouse/PurchaseOrder.js
// Quản lý đơn đặt hàng từ nhà cung cấp
// ============================================

import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    // Mã PO: PO-202502-001
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Nhà cung cấp
    supplier: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      contact: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
    },

    // Danh sách sản phẩm
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
          min: 0,
        },
        receivedQuantity: {
          type: Number,
          default: 0,
          min: 0,
        },
        damagedQuantity: {
          type: Number,
          default: 0,
          min: 0,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Tổng tiền
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    vat: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Điều khoản thanh toán
    paymentTerm: {
      type: String,
      enum: ["COD", "NET7", "NET30", "NET60"],
      default: "NET30",
    },

    // Ngày dự kiến giao hàng
    expectedDeliveryDate: {
      type: Date,
      required: true,
    },

    // Ngày nhận hàng thực tế
    actualDeliveryDate: {
      type: Date,
    },

    // Hạn thanh toán
    paymentDueDate: {
      type: Date,
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
    },

    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByName: {
      type: String,
      required: true,
    },

    // Người duyệt
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedByName: {
      type: String,
    },

    approvedAt: {
      type: Date,
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
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ createdBy: 1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Methods
purchaseOrderSchema.methods.updateReceivedQuantity = async function (sku, quantity) {
  const item = this.items.find((item) => item.sku === sku);
  if (item) {
    item.receivedQuantity += quantity;
    
    // Check if all items are received
    const allReceived = this.items.every(
      (item) => item.receivedQuantity >= item.orderedQuantity
    );
    
    const someReceived = this.items.some((item) => item.receivedQuantity > 0);
    
    if (allReceived) {
      this.status = "COMPLETED";
    } else if (someReceived) {
      this.status = "PARTIAL";
    }
    
    await this.save();
  }
};

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
