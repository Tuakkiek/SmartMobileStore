// ============================================
// FILE: backend/src/models/Order.js
// ✅ FIXED: Added PAYMENT_VERIFIED to status enum
// ✅ ADDED: Better tracking for VNPay payments
// ============================================

import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
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
      enum: ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"],
    },
    productName: { type: String, required: true, trim: true },
    variantSku: { type: String, required: true },
    variantColor: { type: String },
    variantStorage: { type: String },
    variantConnectivity: { type: String },
    variantName: { type: String },
    variantCpuGpu: { type: String },
    variantRam: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    total: { type: Number, required: true, min: 0 },
    images: [String],
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    ward: { type: String, required: true, trim: true },
    detailAddress: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "PENDING",
        "PENDING_PAYMENT",
        "PAYMENT_VERIFIED", // ✅ ADDED
        "CONFIRMED",
        "SHIPPING",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ],
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const posInfoSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffName: { type: String, trim: true },
    cashierName: { type: String, trim: true },
    storeLocation: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
    paymentReceived: { type: Number, min: 0 },
    changeGiven: { type: Number, min: 0 },
  },
  { _id: false }
);

const paymentInfoSchema = new mongoose.Schema(
  {
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },
    paymentReceived: { type: Number, min: 0 },
    changeGiven: { type: Number, min: 0 },
    invoiceNumber: { type: String, trim: true },

    // ✅ ENHANCED VNPay tracking
    vnpayTxnRef: { type: String, trim: true, index: true },
    vnpayTransactionNo: { type: String, trim: true },
    vnpayBankCode: { type: String, trim: true },
    vnpayCardType: { type: String, trim: true },
    vnpayPaidAt: { type: Date },
    vnpayCreatedAt: { type: Date },
    vnpayFailed: { type: Boolean, default: false },
    vnpayFailReason: { type: String },
    vnpayVerified: { type: Boolean, default: false },
    vnpayVerifiedAt: { type: Date },
    vnpayAmount: { type: Number, min: 0 },
    vnpayResponseCode: { type: String },
  },
  { _id: false }
);

const vatInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, trim: true },
    companyName: { type: String, trim: true },
    taxCode: { type: String, trim: true },
    companyAddress: { type: String, trim: true },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    issuedAt: { type: Date },
  },
  { _id: false }
);

// ✅ NEW: Invoice tracking for online orders
const onlineInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, trim: true },
    issuedAt: { type: Date },
    downloadUrl: { type: String }, // For future PDF storage
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, trim: true },

    orderSource: {
      type: String,
      enum: ["ONLINE", "IN_STORE"],
      default: "ONLINE",
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items && items.length > 0,
        message: "Order must have at least one item",
      },
    },

    shippingAddress: { type: addressSchema, required: true },

    totalAmount: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    pointsUsed: { type: Number, default: 0, min: 0 },

    // ✅ UPDATED: Added PAYMENT_VERIFIED
    status: {
      type: String,
      enum: [
        "PENDING",
        "PENDING_PAYMENT",
        "PAYMENT_VERIFIED", // ✅ VNPay confirmed payment
        "CONFIRMED",
        "PROCESSING",
        "SHIPPING",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "BANK_TRANSFER", "CASH", "CARD", "VNPAY"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID"],
      default: "UNPAID",
    },

    notes: { type: String, trim: true },
    statusHistory: { type: [statusHistorySchema], default: [] },

    promotionDiscount: { type: Number, default: 0, min: 0 },
    appliedPromotion: {
      code: { type: String },
      discountAmount: { type: Number },
    },

    posInfo: posInfoSchema,
    paymentInfo: paymentInfoSchema,
    vatInvoice: vatInvoiceSchema,
    onlineInvoice: onlineInvoiceSchema, // ✅ NEW

    shippingNote: { type: String, trim: true },
    shippingProof: {
      photoUrl: { type: String },
      signature: { type: String },
      completedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// ============================================
// HOOKS
// ============================================

orderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const prefix = this.orderSource === "IN_STORE" ? "POS" : "ORD";

    const lastOrder = await mongoose
      .model("Order")
      .findOne({ orderNumber: new RegExp(`^${prefix}${year}${month}${day}`) })
      .sort({ orderNumber: -1 });

    let sequence = 1;
    if (lastOrder?.orderNumber) {
      const lastSeq = parseInt(lastOrder.orderNumber.slice(-4));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    this.orderNumber = `${prefix}${year}${month}${day}${sequence
      .toString()
      .padStart(4, "0")}`;
  }
  next();
});

orderSchema.pre("save", function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.customerId,
      updatedAt: new Date(),
      note:
        this.orderSource === "IN_STORE"
          ? "Đơn hàng tại cửa hàng - Chờ thanh toán"
          : this.paymentMethod === "VNPAY"
          ? "Đơn hàng đã tạo - Chờ thanh toán VNPay"
          : "Đơn hàng được tạo",
    });
  }
  next();
});

// ============================================
// METHODS
// ============================================

orderSchema.methods.updateStatus = async function (status, userId, note) {
  this.status = status;
  this.statusHistory.push({
    status,
    updatedBy: userId,
    updatedAt: new Date(),
    note: note || "",
  });

  if (status === "DELIVERED" && this.paymentMethod === "COD") {
    this.paymentStatus = "PAID";
  }

  return await this.save();
};

orderSchema.methods.cancel = async function (userId, note) {
  if (this.status === "DELIVERED") {
    throw new Error("Cannot cancel delivered order");
  }
  if (this.status === "CANCELLED") {
    throw new Error("Order is already cancelled");
  }

  this.status = "CANCELLED";
  this.statusHistory.push({
    status: "CANCELLED",
    updatedBy: userId,
    updatedAt: new Date(),
    note: note || "Order cancelled",
  });
  return this.save();
};

// ✅ NEW: Issue online invoice
orderSchema.methods.issueOnlineInvoice = async function () {
  if (this.onlineInvoice?.invoiceNumber) {
    throw new Error("Invoice already issued");
  }

  if (this.paymentStatus !== "PAID") {
    throw new Error("Order must be paid first");
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const lastInvoice = await mongoose
    .model("Order")
    .findOne({
      "onlineInvoice.invoiceNumber": new RegExp(`^INV${year}${month}`),
    })
    .sort({ "onlineInvoice.invoiceNumber": -1 });

  let sequence = 1;
  if (lastInvoice?.onlineInvoice?.invoiceNumber) {
    const lastSeq = parseInt(lastInvoice.onlineInvoice.invoiceNumber.slice(-6));
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  const invoiceNumber = `INV${year}${month}${sequence
    .toString()
    .padStart(6, "0")}`;

  this.onlineInvoice = {
    invoiceNumber,
    issuedAt: new Date(),
  };

  return await this.save();
};

// ============================================
// INDEXES
// ============================================
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderSource: 1, createdAt: -1 });
orderSchema.index({ "posInfo.staffId": 1 });
orderSchema.index({ "paymentInfo.processedBy": 1 });
orderSchema.index({ paymentMethod: 1, paymentStatus: 1 });
orderSchema.index({ "paymentInfo.vnpayVerified": 1 });
orderSchema.index({ "paymentInfo.vnpayTxnRef": 1 }); // ✅ For faster lookup

export default mongoose.model("Order", orderSchema);
