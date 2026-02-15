import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import inventoryRoutes from "../modules/inventory/inventoryRoutes.js";
import User from "../modules/auth/User.js";
import Store from "../modules/store/Store.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";
import StockTransfer from "../modules/inventory/StockTransfer.js";
import StockMovement from "../modules/warehouse/StockMovement.js";
import UniversalProduct, {
  UniversalVariant,
} from "../modules/product/UniversalProduct.js";
import Order from "../modules/order/Order.js";
import ReplenishmentSnapshot from "../modules/inventory/ReplenishmentSnapshot.js";
import ReplenishmentRecommendation from "../modules/inventory/ReplenishmentRecommendation.js";
import Notification from "../modules/notification/Notification.js";
import OmnichannelEvent from "../modules/monitoring/OmnichannelEvent.js";
import config from "../config/config.js";

const ROLES = [
  "ADMIN",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "ORDER_MANAGER",
];

process.env.REPLENISHMENT_NOTIFICATIONS_ENABLED = "true";
process.env.OMNICHANNEL_MONITORING_ENABLED = "true";

const JWT_SECRET = config.JWT_SECRET;

let phoneSeed = 100000000;
let storeSeed = 1;
let skuSeed = 1;
let orderSeed = 1;

let replSet;
let app;
let fixture;

const nextPhone = () => `0${String(phoneSeed++).padStart(9, "0")}`;

const nextStoreCode = (prefix = "ST") =>
  `${prefix}${String(storeSeed++).padStart(3, "0")}`;

const nextSku = () => `SKU-TEST-${String(skuSeed++).padStart(5, "0")}`;

const nextOrderNumber = () => `ORD-TEST-${String(orderSeed++).padStart(6, "0")}`;

const authHeader = (role) => ({
  Authorization: `Bearer ${fixture.tokens[role]}`,
});

const createUserByRole = async (role) => {
  const user = await User.create({
    role,
    fullName: `${role} User`,
    phoneNumber: nextPhone(),
    email: `${role.toLowerCase()}@test.local`,
    password: "Strong@1234",
    status: "ACTIVE",
  });

  return user;
};

const createStore = async ({ name, code }) =>
  Store.create({
    code,
    name,
    type: "STORE",
    status: "ACTIVE",
    address: {
      province: "Ho Chi Minh",
      district: "District 1",
      street: "Test Street",
    },
    capacity: {
      maxOrdersPerDay: 100,
      currentOrders: 0,
    },
  });

const seedFixture = async () => {
  const users = {};
  for (const role of ROLES) {
    users[role] = await createUserByRole(role);
  }

  const sourceStore = await createStore({
    name: "Source Store",
    code: nextStoreCode("SRC"),
  });
  const targetStore = await createStore({
    name: "Target Store",
    code: nextStoreCode("DST"),
  });
  const extraStore = await createStore({
    name: "Extra Store",
    code: nextStoreCode("EXT"),
  });

  const product = await UniversalProduct.create({
    name: "Integration Test Phone",
    model: "ITP-01",
    baseSlug: `integration-test-phone-${skuSeed}`,
    slug: `integration-test-phone-${skuSeed}`,
    brand: new mongoose.Types.ObjectId(),
    productType: new mongoose.Types.ObjectId(),
    condition: "NEW",
    createdBy: users.ADMIN._id,
  });

  const variantSku = nextSku();
  const variant = await UniversalVariant.create({
    color: "Black",
    variantName: "128GB",
    originalPrice: 30000000,
    price: 27000000,
    stock: 0,
    images: [],
    sku: variantSku,
    slug: `${product.baseSlug}-${variantSku.toLowerCase()}`,
    productId: product._id,
    attributes: {
      storage: "128GB",
    },
  });

  await StoreInventory.create({
    productId: product._id,
    variantSku: variant.sku,
    storeId: sourceStore._id,
    quantity: 60,
    reserved: 0,
    minStock: 10,
  });

  await StoreInventory.create({
    productId: product._id,
    variantSku: variant.sku,
    storeId: targetStore._id,
    quantity: 0,
    reserved: 0,
    minStock: 10,
  });

  await StoreInventory.create({
    productId: product._id,
    variantSku: variant.sku,
    storeId: extraStore._id,
    quantity: 45,
    reserved: 0,
    minStock: 10,
  });

  for (let dayOffset = 0; dayOffset < 6; dayOffset += 1) {
    await Order.create({
      userId: users.ORDER_MANAGER._id,
      customerId: users.ORDER_MANAGER._id,
      orderNumber: nextOrderNumber(),
      fulfillmentType: "HOME_DELIVERY",
      paymentMethod: "COD",
      paymentStatus: "PAID",
      status: "COMPLETED",
      assignedStore: {
        storeId: targetStore._id,
        storeName: targetStore.name,
        storeCode: targetStore.code,
      },
      items: [
        {
          productId: product._id,
          variantSku: variant.sku,
          name: "Integration Test Phone",
          productName: "Integration Test Phone",
          price: 27000000,
          quantity: 3,
        },
      ],
      createdAt: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000),
    });
  }

  return {
    users,
    stores: {
      sourceStore,
      targetStore,
      extraStore,
    },
    product,
    variant,
    tokens: Object.fromEntries(
      ROLES.map((role) => [
        role,
        jwt.sign({ id: String(users[role]._id) }, JWT_SECRET, { expiresIn: "1h" }),
      ])
    ),
  };
};

const clearAllCollections = async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

before(
  async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: "wiredTiger",
      },
    });

    await mongoose.connect(replSet.getUri(), {
      dbName: "inventory-dashboard-integration",
    });

    app = express();
    app.use(express.json());
    app.use("/api/inventory", inventoryRoutes);
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
  { timeout: 180000 }
);

beforeEach(async () => {
  await clearAllCollections();
  fixture = await seedFixture();
});

after(
  async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  },
  { timeout: 120000 }
);

test("role permissions matrix for targeted dashboard + transfer endpoints", async () => {
  const fakeTransferId = new mongoose.Types.ObjectId().toString();

  const cases = [
    {
      name: "GET /dashboard/replenishment",
      method: "get",
      path: "/api/inventory/dashboard/replenishment",
      allowed: ["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"],
    },
    {
      name: "POST /dashboard/replenishment/run-snapshot",
      method: "post",
      path: "/api/inventory/dashboard/replenishment/run-snapshot",
      allowed: ["ADMIN", "WAREHOUSE_MANAGER"],
      expectAllowedStatus: 200,
      body: {},
    },
    {
      name: "GET /dashboard/predictions",
      method: "get",
      path: "/api/inventory/dashboard/predictions",
      allowed: ["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"],
    },
    {
      name: "POST /transfers/request",
      method: "post",
      path: "/api/inventory/transfers/request",
      allowed: ["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"],
      body: {},
    },
    {
      name: "PUT /transfers/:id/approve",
      method: "put",
      path: `/api/inventory/transfers/${fakeTransferId}/approve`,
      allowed: ["ADMIN", "WAREHOUSE_MANAGER"],
      body: { approvedItems: [] },
    },
    {
      name: "PUT /transfers/:id/reject",
      method: "put",
      path: `/api/inventory/transfers/${fakeTransferId}/reject`,
      allowed: ["ADMIN", "WAREHOUSE_MANAGER"],
      body: { reason: "Not needed" },
    },
    {
      name: "PUT /transfers/:id/ship",
      method: "put",
      path: `/api/inventory/transfers/${fakeTransferId}/ship`,
      allowed: ["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"],
      body: { trackingNumber: "TN", carrier: "Carrier" },
    },
    {
      name: "PUT /transfers/:id/receive",
      method: "put",
      path: `/api/inventory/transfers/${fakeTransferId}/receive`,
      allowed: ["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"],
      body: { receivedItems: [] },
    },
    {
      name: "PUT /transfers/:id/complete",
      method: "put",
      path: `/api/inventory/transfers/${fakeTransferId}/complete`,
      allowed: ["ADMIN", "WAREHOUSE_MANAGER"],
      body: {},
    },
    {
      name: "PUT /transfers/:id/cancel",
      method: "put",
      path: `/api/inventory/transfers/${fakeTransferId}/cancel`,
      allowed: ["ADMIN", "WAREHOUSE_MANAGER"],
      body: { reason: "Cancel test" },
    },
  ];

  for (const endpoint of cases) {
    for (const role of ROLES) {
      let req = request(app)[endpoint.method](endpoint.path).set(authHeader(role));
      if (endpoint.body !== undefined) {
        req = req.send(endpoint.body);
      }

      const response = await req;
      const shouldAllow = endpoint.allowed.includes(role);

      if (!shouldAllow) {
        assert.equal(
          response.status,
          403,
          `${endpoint.name} should reject role ${role}`
        );
        continue;
      }

      assert.notEqual(
        response.status,
        401,
        `${endpoint.name} should authenticate role ${role}`
      );
      assert.notEqual(
        response.status,
        403,
        `${endpoint.name} should authorize role ${role}`
      );

      if (endpoint.expectAllowedStatus) {
        assert.equal(
          response.status,
          endpoint.expectAllowedStatus,
          `${endpoint.name} should return ${endpoint.expectAllowedStatus} for ${role}`
        );
      }
    }
  }
});

test("POST /dashboard/replenishment/run-snapshot and GET /dashboard/replenishment return persisted snapshot", async () => {
  const snapshotResponse = await request(app)
    .post("/api/inventory/dashboard/replenishment/run-snapshot")
    .set(authHeader("ADMIN"))
    .send({});

  assert.equal(snapshotResponse.status, 200);
  assert.equal(snapshotResponse.body.success, true);
  assert.equal(snapshotResponse.body.result.success, true);
  assert.equal(snapshotResponse.body.result.skipped, false);

  const snapshots = await ReplenishmentSnapshot.find().lean();
  const recommendations = await ReplenishmentRecommendation.find().lean();
  assert.equal(snapshots.length, 1);
  assert.ok(recommendations.length > 0);

  const notification = await Notification.findOne({
    eventType: "REPLENISHMENT_CRITICAL_DAILY",
  }).lean();
  assert.ok(notification, "Critical replenishment notification should be created");

  const readResponse = await request(app)
    .get("/api/inventory/dashboard/replenishment")
    .set(authHeader("ORDER_MANAGER"));

  assert.equal(readResponse.status, 200);
  assert.equal(readResponse.body.success, true);
  assert.equal(readResponse.body.dataSource, "SNAPSHOT");
  assert.ok(readResponse.body.snapshot?.snapshotDateKey);
  assert.ok(readResponse.body.recommendations.length > 0);

  const liveResponse = await request(app)
    .get("/api/inventory/dashboard/replenishment?source=live&criticalOnly=1")
    .set(authHeader("WAREHOUSE_STAFF"));

  assert.equal(liveResponse.status, 200);
  assert.equal(liveResponse.body.success, true);
  assert.equal(liveResponse.body.dataSource, "LIVE");
  assert.ok(Array.isArray(liveResponse.body.recommendations));
  assert.ok(
    liveResponse.body.recommendations.every(
      (item) => String(item.priority || "").toUpperCase() === "CRITICAL"
    )
  );
});

test("GET /dashboard/predictions returns demand analysis payload", async () => {
  const response = await request(app)
    .get(
      `/api/inventory/dashboard/predictions?storeId=${fixture.stores.targetStore._id}&daysAhead=14&historicalDays=90`
    )
    .set(authHeader("ADMIN"));

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(Array.isArray(response.body.predictions));
  assert.ok(response.body.predictions.length > 0);

  const targetPrediction = response.body.predictions.find(
    (item) =>
      String(item.variantSku).toUpperCase() ===
      String(fixture.variant.sku).toUpperCase()
  );

  assert.ok(targetPrediction, "Prediction for seeded SKU should exist");
  assert.ok(targetPrediction.predictedDemand >= 1);
  assert.ok(targetPrediction.suggestedReplenishment >= 0);
  assert.equal(
    String(targetPrediction.storeId),
    String(fixture.stores.targetStore._id)
  );
});

test("transfer lifecycle: request -> approve -> ship -> receive -> complete", async () => {
  const requestedQuantity = 5;
  const approvedQuantity = 4;
  const receivedQuantity = 3;

  const requestResponse = await request(app)
    .post("/api/inventory/transfers/request")
    .set(authHeader("ORDER_MANAGER"))
    .send({
      fromStoreId: fixture.stores.sourceStore._id,
      toStoreId: fixture.stores.targetStore._id,
      reason: "RESTOCK",
      notes: "Lifecycle integration test",
      items: [
        {
          variantSku: fixture.variant.sku,
          requestedQuantity,
        },
      ],
    });

  assert.equal(
    requestResponse.status,
    201,
    `request failed: ${JSON.stringify(requestResponse.body)}`
  );
  assert.equal(requestResponse.body.success, true);
  assert.equal(requestResponse.body.transfer.status, "PENDING");

  const transferId = requestResponse.body.transfer._id;

  const approveResponse = await request(app)
    .put(`/api/inventory/transfers/${transferId}/approve`)
    .set(authHeader("WAREHOUSE_MANAGER"))
    .send({
      approvedItems: [
        {
          variantSku: fixture.variant.sku,
          quantity: approvedQuantity,
        },
      ],
    });

  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.success, true);
  assert.equal(approveResponse.body.transfer.status, "APPROVED");

  const reservedSourceAfterApprove = await StoreInventory.findOne({
    storeId: fixture.stores.sourceStore._id,
    productId: fixture.product._id,
    variantSku: fixture.variant.sku,
  }).lean();
  assert.equal(reservedSourceAfterApprove.reserved, approvedQuantity);

  const shipResponse = await request(app)
    .put(`/api/inventory/transfers/${transferId}/ship`)
    .set(authHeader("WAREHOUSE_STAFF"))
    .send({
      trackingNumber: "TRK-123",
      carrier: "InternalCarrier",
    });

  assert.equal(shipResponse.status, 200);
  assert.equal(shipResponse.body.success, true);
  assert.equal(shipResponse.body.transfer.status, "IN_TRANSIT");

  const sourceAfterShip = await StoreInventory.findOne({
    storeId: fixture.stores.sourceStore._id,
    productId: fixture.product._id,
    variantSku: fixture.variant.sku,
  }).lean();
  assert.equal(sourceAfterShip.quantity, 60 - approvedQuantity);
  assert.equal(sourceAfterShip.reserved, 0);

  const receiveResponse = await request(app)
    .put(`/api/inventory/transfers/${transferId}/receive`)
    .set(authHeader("WAREHOUSE_STAFF"))
    .send({
      receivedItems: [
        {
          variantSku: fixture.variant.sku,
          quantity: receivedQuantity,
          reason: "One unit damaged on arrival",
        },
      ],
      notes: "Received with discrepancy",
    });

  assert.equal(receiveResponse.status, 200);
  assert.equal(receiveResponse.body.success, true);
  assert.equal(receiveResponse.body.transfer.status, "RECEIVED");
  assert.equal(receiveResponse.body.discrepancies.length, 1);

  const destinationAfterReceive = await StoreInventory.findOne({
    storeId: fixture.stores.targetStore._id,
    productId: fixture.product._id,
    variantSku: fixture.variant.sku,
  }).lean();
  assert.equal(destinationAfterReceive.quantity, receivedQuantity);
  assert.equal(destinationAfterReceive.available, receivedQuantity);

  const completeResponse = await request(app)
    .put(`/api/inventory/transfers/${transferId}/complete`)
    .set(authHeader("ADMIN"))
    .send({
      notes: "Discrepancy reviewed and accepted",
    });

  assert.equal(completeResponse.status, 200);
  assert.equal(completeResponse.body.success, true);
  assert.equal(completeResponse.body.transfer.status, "COMPLETED");

  const transfer = await StockTransfer.findById(transferId).lean();
  assert.equal(transfer.status, "COMPLETED");
  assert.ok(Array.isArray(transfer.discrepancies));
  assert.equal(transfer.discrepancies.length, 1);

  const movements = await StockMovement.find({
    referenceType: "TRANSFER",
    referenceId: transfer.transferNumber,
  })
    .sort({ createdAt: 1 })
    .lean();

  assert.equal(movements.length, 2);
  assert.equal(movements[0].quantity, approvedQuantity);
  assert.equal(movements[1].quantity, receivedQuantity);
});

test("transfer lifecycle supports reject and cancel with reserved rollback", async () => {
  const rejectRequestResponse = await request(app)
    .post("/api/inventory/transfers/request")
    .set(authHeader("WAREHOUSE_STAFF"))
    .send({
      fromStoreId: fixture.stores.sourceStore._id,
      toStoreId: fixture.stores.targetStore._id,
      reason: "BALANCE",
      items: [
        {
          variantSku: fixture.variant.sku,
          requestedQuantity: 2,
        },
      ],
    });

  assert.equal(
    rejectRequestResponse.status,
    201,
    `request failed: ${JSON.stringify(rejectRequestResponse.body)}`
  );

  const rejectResponse = await request(app)
    .put(`/api/inventory/transfers/${rejectRequestResponse.body.transfer._id}/reject`)
    .set(authHeader("WAREHOUSE_MANAGER"))
    .send({
      reason: "Destination overstocked",
    });

  assert.equal(rejectResponse.status, 200);
  assert.equal(rejectResponse.body.transfer.status, "REJECTED");

  const cancelRequestResponse = await request(app)
    .post("/api/inventory/transfers/request")
    .set(authHeader("ORDER_MANAGER"))
    .send({
      fromStoreId: fixture.stores.sourceStore._id,
      toStoreId: fixture.stores.targetStore._id,
      reason: "RESTOCK",
      items: [
        {
          variantSku: fixture.variant.sku,
          requestedQuantity: 3,
        },
      ],
    });

  assert.equal(
    cancelRequestResponse.status,
    201,
    `cancel request failed: ${JSON.stringify(cancelRequestResponse.body)}`
  );
  const cancelTransferId = cancelRequestResponse.body.transfer._id;

  const approveForCancelResponse = await request(app)
    .put(`/api/inventory/transfers/${cancelTransferId}/approve`)
    .set(authHeader("ADMIN"))
    .send({
      approvedItems: [
        {
          variantSku: fixture.variant.sku,
          quantity: 2,
        },
      ],
    });

  assert.equal(approveForCancelResponse.status, 200);
  assert.equal(approveForCancelResponse.body.transfer.status, "APPROVED");

  const sourceBeforeCancel = await StoreInventory.findOne({
    storeId: fixture.stores.sourceStore._id,
    productId: fixture.product._id,
    variantSku: fixture.variant.sku,
  }).lean();
  assert.equal(sourceBeforeCancel.reserved, 2);

  const cancelResponse = await request(app)
    .put(`/api/inventory/transfers/${cancelTransferId}/cancel`)
    .set(authHeader("WAREHOUSE_MANAGER"))
    .send({
      reason: "Cancelled for test",
    });

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.body.transfer.status, "CANCELLED");

  const sourceAfterCancel = await StoreInventory.findOne({
    storeId: fixture.stores.sourceStore._id,
    productId: fixture.product._id,
    variantSku: fixture.variant.sku,
  }).lean();
  assert.equal(sourceAfterCancel.reserved, 0);
});

test("integration checks: consolidated/store-comparison/alerts/movements respond successfully", async () => {
  const healthChecks = [
    "/api/inventory/dashboard/consolidated",
    "/api/inventory/dashboard/store-comparison",
    "/api/inventory/dashboard/alerts",
    "/api/inventory/dashboard/movements",
    "/api/inventory/transfers",
  ];

  for (const path of healthChecks) {
    const response = await request(app).get(path).set(authHeader("ADMIN"));
    assert.equal(response.status, 200, `${path} should return 200`);
    assert.equal(response.body.success, true, `${path} should return success=true`);
  }
});

test("scheduler job function creates snapshot and recommendation docs", async () => {
  const { runReplenishmentSnapshotJob } = await import(
    "../modules/inventory/replenishmentScheduler.js"
  );

  const result = await runReplenishmentSnapshotJob({
    source: "MANUAL",
    initiatedBy: String(fixture.users.ADMIN._id),
  });

  assert.equal(result.success, true);
  assert.equal(result.skipped, false);

  const snapshot = await ReplenishmentSnapshot.findOne({
    snapshotDateKey: result.snapshotDateKey,
  }).lean();
  assert.ok(snapshot);

  const recommendationCount = await ReplenishmentRecommendation.countDocuments({
    snapshotId: snapshot._id,
  });
  assert.ok(recommendationCount > 0);

  const eventCount = await OmnichannelEvent.countDocuments({
    operation: "inventory_replenishment_notifications",
  });
  assert.ok(eventCount >= 1);
});
