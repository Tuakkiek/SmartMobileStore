// ============================================
// FILE: backend/src/models/Order.js
// ✅ COMPLETE: Order model with detailed variant information
// ============================================

import mongoose from "mongoose";

// Schema cho item trong đơn hàng
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    variantId: {
      // ✅ THÊM: Liên kết với Variant
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    productType: {
      // ✅ THÊM: Loại sản phẩm
      type: String,
      required: true,
      enum: ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"],
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    variantSku: {
      // ✅ THÊM: Mã SKU của variant
      type: String,
      required: true,
    },
    variantColor: {
      // ✅ THÊM: Màu sắc
      type: String,
    },
    variantStorage: {
      // ✅ THÊM: Dung lượng (iPhone, iPad) hoặc tên biến thể (AirPods)
      type: String,
    },
    variantConnectivity: {
      // ✅ THÊM: Kết nối (cho iPad)
      type: String,
    },
    variantName: {
      // ✅ THÊM: Tên biến thể (AirPods, AppleWatch)
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      // ✅ THÊM: Giá niêm yết (hiển thị gạch ngang)
      type: Number,
      min: 0,
    },
    total: {
      // ✅ THÊM: Tổng giá item (price * quantity)
      type: Number,
      required: true,
      min: 0,
    },
    images: [String], // ✅ THÊM: Hình ảnh của variant
  },
  { _id: false }
);

// Schema cho địa chỉ giao hàng
const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    commune: {
      type: String,
      required: true,
      trim: true,
    },
    detailAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// Schema cho lịch sử trạng thái
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPING",
        "DELIVERED",
        "CANCELLED",
      ],
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Schema chính cho đơn hàng
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPING",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "BANK_TRANSFER"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID"],
      default: "UNPAID",
    },
    notes: {
      type: String,
      trim: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    promotionDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    appliedPromotion: {
      code: { type: String },
      discountAmount: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique order number TRƯỚC KHI validate
orderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const lastOrder = await mongoose
      .model("Order")
      .findOne({
        orderNumber: new RegExp(`^ORD${year}${month}${day}`),
      })
      .sort({ orderNumber: -1 });

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    this.orderNumber = `ORD${year}${month}${day}${sequence
      .toString()
      .padStart(4, "0")}`;
  }

  next();
});

// Add initial status to history when creating order
orderSchema.pre("save", function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.customerId,
      updatedAt: new Date(),
      note: "Đơn hàng được tạo",
    });
  }
  next();
});

// Method to update order status
orderSchema.methods.updateStatus = async function (status, userId, note) {
  this.status = status;

  this.addStatusHistory(status, userId, note);

  if (status === "DELIVERED" && this.paymentMethod === "COD") {
    this.paymentStatus = "PAID";
  }

  return await this.save();
};

// Method to cancel order
orderSchema.methods.cancel = async function (userId, note) {
  if (this.status === "DELIVERED") {
    throw new Error("Cannot cancel delivered order");
  }

  if (this.status === "CANCELLED") {
    throw new Error("Order is already cancelled");
  }

  this.status = "CANCELLED";
  this.addStatusHistory("CANCELLED", userId, note || "Order cancelled");

  return this.save();
};

// Method to add status history
orderSchema.methods.addStatusHistory = function (status, userId, note) {
  this.statusHistory.push({
    status,
    updatedBy: userId,
    updatedAt: new Date(),
    note: note || "",
  });
};

// Method to track order
orderSchema.methods.trackOrder = function () {
  return this.statusHistory.sort((a, b) => a.updatedAt - b.updatedAt);
};

// Index for search optimization
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
