import mongoose from "mongoose";
import { branchIsolationPlugin } from "../../authz/branchIsolationPlugin.js";

const purchaseOrderSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    poNumber: {
      type: String,
      required: true,
      trim: true,
    },

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

    paymentTerm: {
      type: String,
      enum: ["COD", "NET7", "NET30", "NET60"],
      default: "NET30",
    },

    expectedDeliveryDate: {
      type: Date,
      required: true,
    },

    actualDeliveryDate: {
      type: Date,
    },

    paymentDueDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByName: {
      type: String,
      required: true,
    },

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

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

purchaseOrderSchema.index({ storeId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ storeId: 1, status: 1 });
purchaseOrderSchema.index({ storeId: 1, createdBy: 1 });
purchaseOrderSchema.index({ storeId: 1, expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ storeId: 1, createdAt: -1 });

purchaseOrderSchema.methods.updateReceivedQuantity = async function updateReceivedQuantity(sku, quantity) {
  const item = this.items.find((nextItem) => nextItem.sku === sku);
  if (item) {
    item.receivedQuantity += quantity;

    const allReceived = this.items.every(
      (nextItem) => nextItem.receivedQuantity >= nextItem.orderedQuantity
    );

    const someReceived = this.items.some((nextItem) => nextItem.receivedQuantity > 0);

    if (allReceived) {
      this.status = "COMPLETED";
    } else if (someReceived) {
      this.status = "PARTIAL";
    }

    await this.save();
  }
};

purchaseOrderSchema.plugin(branchIsolationPlugin, { branchField: "storeId" });

export default
  mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", purchaseOrderSchema);
