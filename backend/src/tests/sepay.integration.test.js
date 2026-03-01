import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

import config from "../config/config.js";
import Cart from "../modules/cart/Cart.js";
import User from "../modules/auth/User.js";
import Order from "../modules/order/Order.js";
import AuditLog from "../modules/audit/AuditLog.js";
import { ORDER_AUDIT_ACTIONS } from "../modules/order/orderAuditActions.js";
import sepayRoutes, { sepayWebhookRouter } from "../modules/payment/sepayRoutes.js";

let mongoServer;
let app;
let phoneSeed = 900000000;
let orderSeed = 1;

const nextPhone = () => `0${String(phoneSeed++).padStart(9, "0")}`;
const nextOrderNumber = () => `ORD-SEPAY-202603-${String(orderSeed++).padStart(6, "0")}`;

const clearAllCollections = async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

const waitForAuditLogs = async (filter, minCount = 1) => {
  const start = Date.now();
  while (Date.now() - start < 3000) {
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).lean();
    if (logs.length >= minCount) {
      return logs;
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  return AuditLog.find(filter).sort({ createdAt: -1 }).lean();
};

const createCustomer = async () => {
  return User.create({
    role: "CUSTOMER",
    fullName: "Sepay Test User",
    phoneNumber: nextPhone(),
    email: `sepay-${Date.now()}-${Math.random()}@test.local`,
    password: "Strong@1234",
    status: "ACTIVE",
  });
};

const buildAuthToken = (user) => {
  return jwt.sign(
    {
      id: String(user._id),
      pv: Number(user.permissionsVersion || 1),
    },
    config.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

const createBankTransferOrder = async ({ ownerId, amount = 1200000, paymentInfo = {} } = {}) => {
  const productId = new mongoose.Types.ObjectId();
  const variantId = new mongoose.Types.ObjectId();
  const sku = `SKU-SEPAY-${Math.floor(Math.random() * 1000000)}`;

  const order = await Order.create({
    userId: ownerId,
    customerId: ownerId,
    orderNumber: nextOrderNumber(),
    orderSource: "ONLINE",
    fulfillmentType: "HOME_DELIVERY",
    items: [
      {
        productId,
        variantId,
        productType: "UNIVERSAL",
        variantSku: sku,
        name: "Integration Phone",
        productName: "Integration Phone",
        price: amount,
        quantity: 1,
      },
    ],
    shippingAddress: {
      fullName: "Sepay Buyer",
      phoneNumber: "0909000000",
      email: "buyer@test.local",
      province: "Can Tho",
      district: "Ninh Kieu",
      ward: "Xuan Khanh",
      detailAddress: "58 Duong 3 Thang 2",
    },
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PENDING",
    status: "PENDING_PAYMENT",
    paymentInfo,
  });

  return {
    order,
    productId,
    variantId,
    sku,
  };
};

before(
  async () => {
    process.env.ORDER_AUDIT_ENABLED = "true";
    process.env.SEPAY_API_TOKEN = "SEPAY_TEST_TOKEN";
    process.env.SEPAY_BANK_ACCOUNT = "70740011223344";
    process.env.SEPAY_BANK_ID = "MB";
    process.env.SEPAY_ACCOUNT_NAME = "NGUYEN TUAN KIET";
    process.env.SEPAY_QR_BASE_URL = "https://qr.sepay.vn/img";
    process.env.SEPAY_PAYMENT_TTL_MINUTES = "15";

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "sepay-integration-test",
    });

    app = express();
    app.use(express.json());
    app.use("/api/payment/sepay", sepayRoutes);
    app.use("/api/sepay", sepayWebhookRouter);
    app.use((err, req, res, next) => {
      if (res.headersSent) {
        return next(err);
      }
      return res.status(500).json({
        success: false,
        message: err.message || "Unhandled test error",
      });
    });
  },
  { timeout: 120000 }
);

beforeEach(async () => {
  await clearAllCollections();
});

after(
  async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  },
  { timeout: 120000 }
);

test("POST /api/payment/sepay/create-qr creates qr payload for owner order and writes audit log", async () => {
  const user = await createCustomer();
  const token = buildAuthToken(user);
  const { order } = await createBankTransferOrder({ ownerId: user._id, amount: 1550000 });

  const response = await request(app)
    .post("/api/payment/sepay/create-qr")
    .set("Authorization", `Bearer ${token}`)
    .send({ orderId: String(order._id) });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.orderId, String(order._id));
  assert.match(response.body.data.orderCode, /^DH\d{9}$/);
  assert.ok(response.body.data.qrUrl.includes("https://qr.sepay.vn/img?"));
  assert.ok(response.body.data.expiresAt);

  const reloadedOrder = await Order.findById(order._id).lean();
  assert.equal(reloadedOrder.paymentInfo.sepayOrderCode, response.body.data.orderCode);
  assert.equal(reloadedOrder.paymentInfo.sepayExpectedAmount, reloadedOrder.totalAmount);
  assert.ok(reloadedOrder.paymentInfo.sepayCreatedAt);
  assert.ok(reloadedOrder.paymentInfo.sepayExpiresAt);

  const logs = await waitForAuditLogs({
    actionType: ORDER_AUDIT_ACTIONS.CREATE_SEPAY_QR,
    orderId: order._id,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].outcome, "SUCCESS");
  assert.equal(logs[0].actor?.actorType, "USER");
  assert.equal(logs[0].actor?.source, "SEPAY_API");
});

test("POST /api/sepay/webhook confirms payment, issues invoice, clears cart item, and writes audit log", async () => {
  const user = await createCustomer();
  const { order, variantId, productId, sku } = await createBankTransferOrder({
    ownerId: user._id,
    amount: 2300000,
    paymentInfo: { sepayOrderCode: "DH123456789" },
  });

  await Cart.create({
    customerId: user._id,
    items: [
      {
        productId,
        variantId,
        productType: "UNIVERSAL",
        quantity: 1,
        price: 2300000,
        sku,
      },
      {
        productId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        productType: "UNIVERSAL",
        quantity: 1,
        price: 1000,
        sku: "SKU-KEEP-1",
      },
    ],
  });

  const payload = {
    transferType: "in",
    transferAmount: 2300000,
    content: "thanh toán đơn DH123456789",
    transactionId: "TXN-001",
  };

  const response = await request(app)
    .post("/api/sepay/webhook")
    .set("Authorization", `Apikey ${process.env.SEPAY_API_TOKEN}`)
    .send(payload);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const reloadedOrder = await Order.findById(order._id).lean();
  assert.equal(reloadedOrder.paymentStatus, "PAID");
  assert.equal(reloadedOrder.status, "PENDING");
  assert.equal(reloadedOrder.paymentInfo?.sepayVerified, true);
  assert.equal(reloadedOrder.paymentInfo?.sepayTransactionId, "TXN-001");
  assert.equal(reloadedOrder.paymentInfo?.sepayLastWebhookStatus, "PAID");
  assert.ok(reloadedOrder.onlineInvoice?.invoiceNumber);

  const cart = await Cart.findOne({ customerId: user._id }).lean();
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].sku, "SKU-KEEP-1");

  const logs = await waitForAuditLogs({
    actionType: ORDER_AUDIT_ACTIONS.PROCESS_SEPAY_WEBHOOK,
    orderId: order._id,
  });
  assert.ok(logs.length >= 1);
  assert.equal(logs[0].outcome, "SUCCESS");
  assert.equal(logs[0].actor?.actorType, "SYSTEM");
  assert.equal(logs[0].actor?.source, "SEPAY_WEBHOOK");
});

test("POST /api/payment/sepay/webhook handles duplicate idempotently without adding history", async () => {
  const user = await createCustomer();
  const { order } = await createBankTransferOrder({
    ownerId: user._id,
    amount: 3100000,
    paymentInfo: { sepayOrderCode: "DH555666777" },
  });

  const firstPayload = {
    transferType: "in",
    transferAmount: 3100000,
    content: "nộp tiền DH555666777",
    transactionId: "TXN-DUP-1",
  };

  const firstResponse = await request(app)
    .post("/api/payment/sepay/webhook")
    .set("Authorization", `Bearer ${process.env.SEPAY_API_TOKEN}`)
    .send(firstPayload);
  assert.equal(firstResponse.status, 200);

  const afterFirst = await Order.findById(order._id).lean();
  const historySizeAfterFirst = (afterFirst.statusHistory || []).length;
  assert.equal(afterFirst.paymentStatus, "PAID");

  const duplicateResponse = await request(app)
    .post("/api/payment/sepay/webhook")
    .set("Authorization", process.env.SEPAY_API_TOKEN)
    .send(firstPayload);

  assert.equal(duplicateResponse.status, 200);
  assert.equal(duplicateResponse.body.duplicated, true);

  const afterDuplicate = await Order.findById(order._id).lean();
  assert.equal(afterDuplicate.paymentStatus, "PAID");
  assert.equal((afterDuplicate.statusHistory || []).length, historySizeAfterFirst);
});

test("webhook with insufficient amount keeps order pending payment", async () => {
  const user = await createCustomer();
  const { order } = await createBankTransferOrder({
    ownerId: user._id,
    amount: 4000000,
    paymentInfo: { sepayOrderCode: "DH999888777" },
  });

  const response = await request(app)
    .post("/api/sepay/webhook")
    .set("Authorization", `Apikey ${process.env.SEPAY_API_TOKEN}`)
    .send({
      transferType: "in",
      transferAmount: 3999999,
      content: "chuyển khoản DH999888777",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const reloadedOrder = await Order.findById(order._id).lean();
  assert.equal(reloadedOrder.status, "PENDING_PAYMENT");
  assert.equal(reloadedOrder.paymentStatus, "PENDING");
  assert.equal(reloadedOrder.paymentInfo?.sepayLastWebhookStatus, "INSUFFICIENT_AMOUNT");
  assert.equal(reloadedOrder.paymentInfo?.sepayLastInsufficientPayment?.requiredAmount, 4000000);
});

test("webhook with missing or invalid token returns 401", async () => {
  const responseMissing = await request(app).post("/api/sepay/webhook").send({
    transferType: "in",
    transferAmount: 1000,
    content: "DH123456789",
  });
  assert.equal(responseMissing.status, 401);

  const responseWrong = await request(app)
    .post("/api/sepay/webhook")
    .set("Authorization", "Apikey WRONG_TOKEN")
    .send({
      transferType: "in",
      transferAmount: 1000,
      content: "DH123456789",
    });
  assert.equal(responseWrong.status, 401);
});

test("webhook without order code returns 200 and does not update orders", async () => {
  const user = await createCustomer();
  const { order } = await createBankTransferOrder({
    ownerId: user._id,
    amount: 2500000,
    paymentInfo: { sepayOrderCode: "DH111222333" },
  });

  const response = await request(app)
    .post("/api/sepay/webhook")
    .set("Authorization", `Bearer ${process.env.SEPAY_API_TOKEN}`)
    .send({
      transferType: "in",
      transferAmount: 2500000,
      content: "thanh toán đơn hàng không mã",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "Order code not found");

  const reloadedOrder = await Order.findById(order._id).lean();
  assert.equal(reloadedOrder.status, "PENDING_PAYMENT");
  assert.equal(reloadedOrder.paymentStatus, "PENDING");
});
