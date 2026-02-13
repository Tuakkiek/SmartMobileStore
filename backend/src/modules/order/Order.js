// ============================================
// FILE: backend/src/modules/order/Order.js
// Model đơn hàng
// ============================================

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // User who placed the order
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Order number (unique)
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Order items
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UniversalProduct",
        },
        variantSku: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        image: String,
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        subtotal: {
          type: Number,
          default: function () {
            return this.price * this.quantity;
          },
        },
      },
    ],

    // Shipping information
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
      email: String,
      province: String,
      district: String,
      ward: String,
      detailAddress: {
        type: String,
        required: true,
      },
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ["COD", "BANK_TRANSFER", "MOMO", "VNPAY", "CREDIT_CARD"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    paidAt: Date,

    // Order status
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "SHIPPING",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Timestamps for status changes
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Notes
    notes: String,
    cancelReason: String,

    // Tracking
    trackingNumber: String,
    shippingProvider: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
orderSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    this.total = this.subtotal + this.shippingFee - this.discount;
  }
  next();
});

export default mongoose.model("Order", orderSchema);
