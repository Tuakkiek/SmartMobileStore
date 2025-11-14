// backend/src/models/Order.js - CẬP NHẬT CHO POS
import mongoose from "mongoose";

// Schema cho item trong đơn hàng
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
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    variantSku: {
      type: String,
      required: true,
    },
    variantColor: { type: String },
    variantStorage: { type: String },
    variantConnectivity: { type: String },
    variantName: { type: String },
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
      type: Number,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [String],
  },
  { _id: false }
);

// Schema địa chỉ giao hàng
const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    commune: { type: String, required: true, trim: true },
    detailAddress: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Schema lịch sử trạng thái
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "PENDING",
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
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    note: { type: String, trim: true },
  },
  { _id: false }
);

// ✅ MỚI: Schema thông tin POS
const posInfoSchema = new mongoose.Schema(
  {
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeLocation: {
      type: String,
      trim: true,
    },
    cashierName: {
      type: String,
      trim: true,
    },
    paymentReceived: {
      type: Number,
      min: 0,
    },
    changeGiven: {
      type: Number,
      min: 0,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// ✅ MỚI: Schema hóa đơn VAT
const vatInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    taxCode: {
      type: String,
      trim: true,
    },
    companyAddress: {
      type: String,
      trim: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    issuedAt: {
      type: Date,
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

    // ✅ MỚI: Phân biệt đơn ONLINE vs POS
    orderType: {
      type: String,
      enum: ["ONLINE", "POS"],
      default: "ONLINE",
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
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
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

    // ✅ MỚI: Thông tin POS (chỉ có khi orderType = "POS")
    posInfo: posInfoSchema,

    // ✅ MỚI: Hóa đơn VAT (nếu khách yêu cầu)
    vatInvoice: vatInvoiceSchema,
  },
  {
    timestamps: true,
  }
);

// Tạo mã đơn hàng tự động
orderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // ✅ Phân biệt prefix theo orderType
    const prefix = this.orderType === "POS" ? "POS" : "ORD";

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
        this.orderType === "POS"
          ? "Đơn hàng tại cửa hàng"
          : "Đơn hàng được tạo",
    });
  }
  next();
});

// Cập nhật trạng thái
orderSchema.methods.updateStatus = async function (status, userId, note) {
  this.status = status;
  this.addStatusHistory(status, userId, note);

  if (status === "DELIVERED" && this.paymentMethod === "COD") {
    this.paymentStatus = "PAID";
  }

  return await this.save();
};

// Hủy đơn hàng
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

// Thêm lịch sử trạng thái
orderSchema.methods.addStatusHistory = function (status, userId, note) {
  this.statusHistory.push({
    status,
    updatedBy: userId,
    updatedAt: new Date(),
    note: note || "",
  });
};

// Theo dõi đơn hàng
orderSchema.methods.trackOrder = function () {
  return this.statusHistory.sort((a, b) => a.updatedAt - b.updatedAt);
};

// Tối ưu tìm kiếm
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderType: 1, createdAt: -1 });
orderSchema.index({ "posInfo.cashierId": 1 });

export default mongoose.model("Order", orderSchema);
