import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

import Order from "../modules/order/Order.js";
import AuditLog from "../modules/audit/AuditLog.js";
import { ORDER_AUDIT_ACTIONS } from "../modules/order/orderAuditActions.js";
import { orderAuditMiddleware } from "../modules/order/orderAuditMiddleware.js";
import { resolveOrderIdFromVnpTxnRef } from "../modules/order/orderAuditAdapter.js";
import { AUDIT_REDACTED_VALUE } from "../modules/audit/auditMasking.js";

let mongoServer;
let app;
let orderSeed = 1;

const userId = new mongoose.Types.ObjectId();
const branchId = new mongoose.Types.ObjectId();

const nextOrderNumber = () => `ORD-AUD-${String(orderSeed++).padStart(6, "0")}`;

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

const createOrderDoc = async (overrides = {}) => {
  return Order.create({
    orderNumber: nextOrderNumber(),
    orderSource: "ONLINE",
    fulfillmentType: "HOME_DELIVERY",
    userId,
    customerId: userId,
    items: [
      {
        price: 1000,
        quantity: 1,
      },
    ],
    shippingAddress: {
      fullName: "Test User",
      phoneNumber: "0909000000",
      email: "test@example.com",
      detailAddress: "123 Main Street",
    },
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    status: "PENDING",
    assignedStore: {
      storeId: branchId,
      storeName: "Branch Test",
    },
    ...overrides,
  });
};

before(
  async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "order-audit-log-integration-test",
    });

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      if (req.path.startsWith("/payment/")) {
        return next();
      }

      req.user = {
        _id: userId,
        role: "ORDER_MANAGER",
      };
      req.authz = {
        activeBranchId: String(branchId),
        isGlobalAdmin: false,
      };
      return next();
    });

    app.post(
      "/orders",
      orderAuditMiddleware({
        actionType: ORDER_AUDIT_ACTIONS.CREATE_ORDER,
        source: "TEST_API",
      }),
      async (req, res) => {
        const order = await createOrderDoc({
          shippingAddress: req.body.shippingAddress,
        });
        return res.status(201).json({
          success: true,
          data: { order },
        });
      }
    );

    app.patch(
      "/orders/:id/status",
      orderAuditMiddleware({
        actionType: ORDER_AUDIT_ACTIONS.UPDATE_STATUS,
        source: "TEST_API",
      }),
      async (req, res) => {
        const order = await Order.findById(req.params.id);
        if (!order) {
          return res.status(404).json({
            success: false,
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          });
        }

        const nextStatus = String(req.body.status || "").trim().toUpperCase();
        if (!["CONFIRMED", "CANCELLED"].includes(nextStatus)) {
          return res.status(400).json({
            success: false,
            code: "INVALID_STATUS",
            message: "Invalid status transition",
          });
        }

        order.status = nextStatus;
        await order.save();

        return res.json({
          success: true,
          data: { order },
        });
      }
    );

    app.get(
      "/payment/vnpay/ipn",
      orderAuditMiddleware({
        actionType: ORDER_AUDIT_ACTIONS.PROCESS_VNPAY_IPN,
        source: "VNPAY_IPN",
        resolveOrderId: (req) => resolveOrderIdFromVnpTxnRef(req.query?.vnp_TxnRef),
      }),
      async (req, res) => {
        const orderId = resolveOrderIdFromVnpTxnRef(req.query?.vnp_TxnRef);
        if (!orderId) {
          return res.status(400).json({
            RspCode: "97",
            message: "Invalid txn ref",
          });
        }

        const order = await Order.findById(orderId);
        if (!order) {
          return res.status(404).json({
            RspCode: "01",
            message: "Order not found",
          });
        }

        if (String(req.query?.vnp_ResponseCode || "") === "00") {
          order.paymentStatus = "PAID";
          order.status = "PENDING";
        } else {
          order.paymentStatus = "FAILED";
          order.status = "PAYMENT_FAILED";
        }

        await order.save();
        return res.status(200).json({
          RspCode: "00",
          message: "Processed",
          orderId: String(order._id),
        });
      }
    );
  },
  { timeout: 120000 }
);

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
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

test("logs create order success with masked sensitive fields", async () => {
  const response = await request(app).post("/orders").send({
    shippingAddress: {
      fullName: "Alice Example",
      phoneNumber: "0911000222",
      email: "alice@example.com",
      detailAddress: "12 Secret Alley",
    },
  });

  assert.equal(response.status, 201);

  const logs = await waitForAuditLogs({
    actionType: ORDER_AUDIT_ACTIONS.CREATE_ORDER,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].outcome, "SUCCESS");
  assert.equal(logs[0].newValues?.shippingAddress?.fullName, AUDIT_REDACTED_VALUE);
  assert.equal(logs[0].newValues?.shippingAddress?.phoneNumber, AUDIT_REDACTED_VALUE);
  assert.equal(logs[0].newValues?.shippingAddress?.detailAddress, AUDIT_REDACTED_VALUE);
});

test("logs status update success with before/after changed values", async () => {
  const order = await createOrderDoc({ status: "PENDING" });

  const response = await request(app).patch(`/orders/${order._id}/status`).send({
    status: "CONFIRMED",
  });

  assert.equal(response.status, 200);

  const logs = await waitForAuditLogs({
    actionType: ORDER_AUDIT_ACTIONS.UPDATE_STATUS,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].outcome, "SUCCESS");
  assert.equal(logs[0].oldValues?.status, "PENDING");
  assert.equal(logs[0].newValues?.status, "CONFIRMED");
});

test("logs failed status update when order context is known", async () => {
  const order = await createOrderDoc({ status: "PENDING" });

  const response = await request(app).patch(`/orders/${order._id}/status`).send({
    status: "UNKNOWN_STATUS",
  });

  assert.equal(response.status, 400);

  const logs = await waitForAuditLogs({
    actionType: ORDER_AUDIT_ACTIONS.UPDATE_STATUS,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].outcome, "FAILED");
  assert.equal(logs[0].failureContext?.httpStatus, 400);
  assert.equal(logs[0].failureContext?.errorCode, "INVALID_STATUS");
});

test("logs vnpay ipn with SYSTEM actor", async () => {
  const order = await createOrderDoc({
    paymentMethod: "VNPAY",
    status: "PENDING_PAYMENT",
    paymentStatus: "PENDING",
  });

  const response = await request(app)
    .get("/payment/vnpay/ipn")
    .query({
      vnp_TxnRef: `${order._id}123456`,
      vnp_ResponseCode: "00",
    });

  assert.equal(response.status, 200);

  const logs = await waitForAuditLogs({
    actionType: ORDER_AUDIT_ACTIONS.PROCESS_VNPAY_IPN,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].actor?.actorType, "SYSTEM");
  assert.equal(logs[0].actor?.source, "VNPAY_IPN");
});
