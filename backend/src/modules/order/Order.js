import mongoose from "mongoose";

const ORDER_STATUSES = [
  "PENDING",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PAYMENT_VERIFIED",
  "CONFIRMED",
  "PROCESSING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PREPARING_SHIPMENT",
  "SHIPPING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PICKED_UP",
  "COMPLETED",
  "DELIVERY_FAILED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
];

const PAYMENT_STATUSES = ["PENDING", "UNPAID", "PAID", "FAILED", "REFUNDED"];
const PAYMENT_METHODS = [
  "COD",
  "BANK_TRANSFER",
  "MOMO",
  "VNPAY",
  "CREDIT_CARD",
  "CASH",
  "INSTALLMENT",
];

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalVariant",
    },
    productType: {
      type: String,
      trim: true,
    },
    variantSku: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    images: [{ type: String, trim: true }],
    variantColor: { type: String, trim: true },
    variantStorage: { type: String, trim: true },
    variantConnectivity: { type: String, trim: true },
    variantName: { type: String, trim: true },
    variantCpuGpu: { type: String, trim: true },
    variantRam: { type: String, trim: true },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      min: 0,
    },
    total: {
      type: Number,
      min: 0,
    },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    note: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    orderSource: {
      type: String,
      enum: ["ONLINE", "IN_STORE"],
      default: "ONLINE",
    },

    fulfillmentType: {
      type: String,
      enum: ["HOME_DELIVERY", "CLICK_AND_COLLECT", "IN_STORE"],
      default: "HOME_DELIVERY",
    },

    items: [orderItemSchema],

    shippingAddress: {
      fullName: { type: String, trim: true },
      phoneNumber: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      province: { type: String, trim: true },
      district: { type: String, trim: true },
      ward: { type: String, trim: true },
      detailAddress: { type: String, trim: true },
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING",
    },

    paidAt: Date,

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PENDING",
    },

    subtotal: {
      type: Number,
      min: 0,
      default: 0,
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

    promotionDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    assignedStore: {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
      storeName: String,
      storeCode: String,
      storeAddress: String,
      storePhone: String,
      assignedAt: Date,
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    pickupInfo: {
      expectedPickupDate: Date,
      pickupCode: String,
      pickedUpAt: Date,
      pickedUpBy: {
        name: String,
        idCard: String,
        phone: String,
      },
    },

    shipperInfo: {
      shipperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      shipperName: String,
      shipperPhone: String,
      assignedAt: Date,
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    installmentInfo: {
      provider: String,
      months: Number,
      monthlyPayment: Number,
      interestRate: Number,
      totalPayment: Number,
      applicationId: String,
      approvedAt: Date,
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
      },
    },

    tradeInInfo: {
      oldProductName: String,
      oldProductSku: String,
      oldProductCondition: String,
      estimatedValue: Number,
      finalValue: Number,
      evaluatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      evaluatedAt: Date,
      images: [String],
    },

    pointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    appliedPromotion: {
      code: String,
      discountAmount: { type: Number, default: 0 },
    },

    paymentInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    posInfo: {
      staffId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      staffName: String,
      cashierId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      cashierName: String,
      storeLocation: String,
      receiptNumber: String,
      paymentReceived: Number,
      changeGiven: Number,
    },

    vatInvoice: {
      invoiceNumber: String,
      companyName: String,
      taxCode: String,
      companyAddress: String,
      issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      issuedAt: Date,
    },

    onlineInvoice: {
      invoiceNumber: String,
      issuedAt: Date,
      note: String,
    },

    statusHistory: [statusHistorySchema],

    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    inventoryDeductedAt: Date,

    notes: String,
    note: String,
    cancelReason: String,

    trackingNumber: String,
    shippingProvider: String,
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "assignedStore.storeId": 1 });
orderSchema.index({ "shipperInfo.shipperId": 1 });

orderSchema.pre("validate", function normalizeCustomerAndSource(next) {
  if (!this.customerId && this.userId) {
    this.customerId = this.userId;
  }

  if (!this.userId && this.customerId) {
    this.userId = this.customerId;
  }

  if (!this.orderSource) {
    this.orderSource = this.fulfillmentType === "IN_STORE" ? "IN_STORE" : "ONLINE";
  }

  if (!this.fulfillmentType) {
    this.fulfillmentType = this.orderSource === "IN_STORE" ? "IN_STORE" : "HOME_DELIVERY";
  }

  next();
});

orderSchema.pre("save", function normalizeTotals(next) {
  const items = Array.isArray(this.items) ? this.items : [];

  for (const item of items) {
    if (!item.name && item.productName) {
      item.name = item.productName;
    }

    if (!item.productName && item.name) {
      item.productName = item.name;
    }

    if (!item.subtotal || this.isModified("items")) {
      item.subtotal = toSafeNumber(item.price) * toSafeNumber(item.quantity, 1);
    }

    if (!item.total || this.isModified("items")) {
      item.total = item.subtotal;
    }
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + toSafeNumber(item.price) * toSafeNumber(item.quantity, 1);
  }, 0);

  this.subtotal = subtotal;

  const shippingFee = toSafeNumber(this.shippingFee);
  const discount = toSafeNumber(this.discount) + toSafeNumber(this.promotionDiscount);
  const computedTotal = Math.max(0, subtotal + shippingFee - discount);

  this.total = computedTotal;
  this.totalAmount = computedTotal;

  if (this.paymentStatus === "PAID" && !this.paidAt) {
    this.paidAt = new Date();
  }

  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [
      {
        status: this.status,
        updatedBy: this.customerId || this.userId,
        updatedAt: new Date(),
        note: "Order created",
      },
    ];
  }

  next();
});

orderSchema.methods.getCustomerId = function getCustomerId() {
  return this.customerId || this.userId;
};

orderSchema.methods.appendStatusHistory = function appendStatusHistory(
  status,
  updatedBy,
  note = ""
) {
  if (!Array.isArray(this.statusHistory)) {
    this.statusHistory = [];
  }

  this.statusHistory.push({
    status,
    updatedBy: updatedBy || this.getCustomerId(),
    updatedAt: new Date(),
    note,
  });
};

orderSchema.methods.cancel = async function cancelOrder(updatedBy, reason = "") {
  this.status = "CANCELLED";
  this.cancelledAt = new Date();
  this.cancelReason = reason || this.cancelReason || "Cancelled by user";

  this.appendStatusHistory(
    "CANCELLED",
    updatedBy || this.getCustomerId(),
    this.cancelReason
  );

  return this.save();
};

orderSchema.methods.issueOnlineInvoice = async function issueOnlineInvoice() {
  if (this.onlineInvoice?.invoiceNumber) {
    return this.onlineInvoice;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const lastInvoice = await this.constructor
    .findOne({
      "onlineInvoice.invoiceNumber": new RegExp(`^ONL${year}${month}`),
    })
    .sort({ "onlineInvoice.invoiceNumber": -1 });

  let seq = 1;
  if (lastInvoice?.onlineInvoice?.invoiceNumber) {
    const lastSeq = parseInt(lastInvoice.onlineInvoice.invoiceNumber.slice(-6), 10);
    if (!Number.isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  this.onlineInvoice = {
    invoiceNumber: `ONL${year}${month}${String(seq).padStart(6, "0")}`,
    issuedAt: new Date(),
    note: "Auto-generated for online order",
  };

  await this.save();
  return this.onlineInvoice;
};

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
