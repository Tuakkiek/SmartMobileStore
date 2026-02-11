// ============================================
// FILE: backend/src/models/Cart.js
// ✅ UPDATED: Added productType field
// ============================================

import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    productType: {
      type: String,
      required: true,
      // ✅ BỎ ENUM HOẶC MỞ RỘNG
      // Nếu có enum, xóa dòng này đi:
      // enum: ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"],
      // HOẶC mở rộng để chấp nhận mọi string
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sku: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

// Virtual để tính tổng tiền
cartSchema.virtual("totalAmount").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

// Virtual để tính tổng số lượng
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.quantity;
  }, 0);
});

// Đảm bảo virtuals được include khi convert to JSON
cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
