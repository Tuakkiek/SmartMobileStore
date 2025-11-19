// ============================================
// FILE: backend/src/models/Order.js
// ✅ CẬP NHẬT: Thêm orderSource để phân biệt online/offline
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
    ward: { type: String, required: true, trim: true }, // Chỉ giữ ward
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
        "PENDING_PAYMENT", // ✅ MỚI: Chờ thanh toán (POS)
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

// ✅ Schema thông tin POS
const posInfoSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffName: { type: String, trim: true },
    cashierName: { type: String, trim: true }, // ✅ THÊM - Tên thu ngân (dùng khi in)
    storeLocation: { type: String, trim: true },
    receiptNumber: { type: String, trim: true }, // Số phiếu tạm

    // ✅ THÊM - Thông tin thanh toán nhanh (để in hóa đơn)
    paymentReceived: { type: Number, min: 0 },
    changeGiven: { type: Number, min: 0 },
  },
  { _id: false }
);

// ✅ Schema thanh toán (Thu ngân xử lý)
const paymentInfoSchema = new mongoose.Schema(
  {
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: { type: Date },
    paymentReceived: { type: Number, min: 0 },
    changeGiven: { type: Number, min: 0 },
    invoiceNumber: { type: String, trim: true }, // Số hóa đơn chính thức
  },
  { _id: false }
);

// ✅ Schema hóa đơn VAT
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

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, trim: true },

    // ✅ MỚI: Phân biệt nguồn đơn hàng
    orderSource: {
      type: String,
      enum: ["ONLINE", "IN_STORE"], // ONLINE = Web, IN_STORE = Tại cửa hàng
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

    status: {
      type: String,
      enum: [
        "PENDING",
        "PENDING_PAYMENT", // ✅ Chờ thanh toán (POS chuyển sang Thu ngân)
        "CONFIRMED",
        "SHIPPING",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "BANK_TRANSFER", "CASH", "CARD"],
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

    // ✅ Thông tin POS (chỉ có khi orderSource = IN_STORE)
    posInfo: posInfoSchema,

    // ✅ Thông tin thanh toán (Thu ngân xử lý)
    paymentInfo: paymentInfoSchema,

    // ✅ Hóa đơn VAT (nếu khách yêu cầu)
    vatInvoice: vatInvoiceSchema,
  },
  { timestamps: true }
);

// ============================================
// HOOKS
// ============================================

// Tạo mã đơn hàng tự động
orderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // ✅ Prefix theo nguồn đơn
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

// Thêm trạng thái ban đầu vào lịch sử
orderSchema.pre("save", function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.customerId,
      updatedAt: new Date(),
      note:
        this.orderSource === "IN_STORE"
          ? "Đơn hàng tại cửa hàng - Chờ thanh toán"
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

// ✅ MỚI: Xử lý thanh toán (Thu ngân)
orderSchema.methods.processPayment = async function (
  CASHIERId,
  paymentReceived
) {
  if (this.status !== "PENDING_PAYMENT") {
    throw new Error("Order is not in pending payment status");
  }

  const changeGiven = Math.max(0, paymentReceived - this.totalAmount);

  // Tạo số hóa đơn chính thức
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const lastInvoice = await mongoose
    .model("Order")
    .findOne({
      "paymentInfo.invoiceNumber": new RegExp(`^INV${year}${month}`),
    })
    .sort({ "paymentInfo.invoiceNumber": -1 });

  let sequence = 1;
  if (lastInvoice?.paymentInfo?.invoiceNumber) {
    const lastSeq = parseInt(lastInvoice.paymentInfo.invoiceNumber.slice(-6));
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  const invoiceNumber = `INV${year}${month}${sequence
    .toString()
    .padStart(6, "0")}`;

  this.paymentInfo = {
    processedBy: CASHIERId,
    processedAt: new Date(),
    paymentReceived,
    changeGiven,
    invoiceNumber,
  };

  this.paymentStatus = "PAID";
  this.status = "DELIVERED"; // Đơn tại cửa hàng = giao ngay

  this.statusHistory.push({
    status: "DELIVERED",
    updatedBy: CASHIERId,
    updatedAt: new Date(),
    note: `Đã thanh toán - Hóa đơn ${invoiceNumber}`,
  });

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

export default mongoose.model("Order", orderSchema);
