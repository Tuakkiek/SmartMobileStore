import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../modules/auth/User.js";
import Order from "../modules/order/Order.js";
import { updateOrderStatus } from "../modules/order/orderController.js";
import {
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
} from "../modules/order/posController.js";
import Inventory from "../modules/warehouse/Inventory.js";
import WarehouseLocation from "../modules/warehouse/WarehouseLocation.js";
import StockMovement from "../modules/warehouse/StockMovement.js";

dotenv.config();

const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_CONNECTIONSTRING ||
  process.env.MONGO_URL;
const MONGO_URI = rawMongoUri?.trim().replace(/^"|"$/g, "");

if (!MONGO_URI) {
  console.error("[PHASE4][SMOKE] Missing MONGO_URI/MONGODB_URI");
  process.exit(1);
}

const log = (...args) => console.log("[PHASE4][SMOKE]", ...args);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const makeRes = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.payload = data;
    return this;
  },
});

const invokeController = async (controller, req) => {
  const res = makeRes();
  await controller(req, res);
  return res;
};

const run = async () => {
  const createdOrderIds = [];
  const cleanupRefIds = [];
  const cleanupLocationCodes = [];

  try {
    await mongoose.connect(MONGO_URI);
    log("Mongo connected");

    const managerUser =
      (await User.findOne({ role: "ORDER_MANAGER" }).select("_id role fullName name")) ||
      (await User.findOne({ role: "ADMIN" }).select("_id role fullName name"));
    const cashierUser =
      (await User.findOne({ role: "CASHIER" }).select("_id role fullName name")) ||
      (await User.findOne({ role: "ADMIN" }).select("_id role fullName name"));

    assert(managerUser, "No ORDER_MANAGER/ADMIN user found");
    assert(cashierUser, "No CASHIER/ADMIN user found");
    log("Users resolved", {
      managerRole: managerUser.role,
      cashierRole: cashierUser.role,
    });

    const nowSuffix = Date.now();
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();
    const sku1 = `PH4-SMOKE-SKU1-${nowSuffix}`;
    const sku2 = `PH4-SMOKE-SKU2-${nowSuffix}`;

    const buildOrderPayload = (orderNumber, sku) => ({
      orderNumber,
      orderSource: "IN_STORE",
      fulfillmentType: "IN_STORE",
      customerId: managerUser._id,
      shippingAddress: {
        fullName: "Phase4 Smoke Customer",
        phoneNumber: "0900000000",
        detailAddress: "At store counter",
      },
      paymentMethod: "CASH",
      paymentStatus: "UNPAID",
      status: "CONFIRMED",
      items: [
        {
          productId,
          variantId,
          productType: "iPhone",
          productName: "Phase4 Smoke Product",
          variantSku: sku,
          quantity: 2,
          price: 1000000,
        },
      ],
      subtotal: 2000000,
      shippingFee: 0,
      totalAmount: 2000000,
    });

    const orderSuccess = await Order.create(
      buildOrderPayload(`PH4-SMOKE-SUCCESS-${nowSuffix}`, sku1)
    );
    const orderCancel = await Order.create(
      buildOrderPayload(`PH4-SMOKE-CANCEL-${nowSuffix}`, sku2)
    );

    createdOrderIds.push(orderSuccess._id, orderCancel._id);
    cleanupRefIds.push(String(orderSuccess._id), String(orderCancel._id));
    log("Orders created", {
      successOrder: orderSuccess.orderNumber,
      cancelOrder: orderCancel.orderNumber,
    });

    // Prepare fake picked inventory for cancel flow restore validation.
    const locationCode = `PH4-LOC-${nowSuffix}`;
    cleanupLocationCodes.push(locationCode);

    const location = await WarehouseLocation.create({
      locationCode,
      warehouse: "WH-HCM",
      zone: "PH4",
      zoneName: "Phase4",
      aisle: "A1",
      shelf: "S1",
      bin: "B1",
      capacity: 100,
      currentLoad: 8,
      status: "ACTIVE",
    });

    await Inventory.create({
      sku: sku2,
      productId,
      productName: "Phase4 Smoke Product",
      locationId: location._id,
      locationCode,
      quantity: 8,
      status: "GOOD",
    });

    await StockMovement.create({
      type: "OUTBOUND",
      sku: sku2,
      productId,
      productName: "Phase4 Smoke Product",
      fromLocationId: location._id,
      fromLocationCode: locationCode,
      quantity: 2,
      referenceType: "ORDER",
      referenceId: String(orderCancel._id),
      performedBy: managerUser._id,
      performedByName: managerUser.fullName || managerUser.name || "Manager",
      notes: "Simulated pick for phase4 smoke",
    });

    // Phase path: CONFIRMED -> PICKING -> PICKUP_COMPLETED -> PENDING_PAYMENT
    const progressToCashier = async (orderId) => {
      const statuses = ["PICKING", "PICKUP_COMPLETED", "PENDING_PAYMENT"];
      for (const status of statuses) {
        const res = await invokeController(updateOrderStatus, {
          params: { id: String(orderId) },
          body: { status, note: `Smoke move to ${status}` },
          user: {
            _id: managerUser._id,
            role: managerUser.role,
            fullName: managerUser.fullName || managerUser.name || "Manager",
          },
        });
        assert(res.statusCode === 200, `updateOrderStatus(${status}) failed`);
      }
    };

    await progressToCashier(orderSuccess._id);
    await progressToCashier(orderCancel._id);
    log("Orders progressed to cashier queue");

    const queueRes = await invokeController(getPendingOrders, {
      query: { page: "1", limit: "100" },
      user: {
        _id: cashierUser._id,
        role: cashierUser.role,
        fullName: cashierUser.fullName || cashierUser.name || "Cashier",
      },
    });
    assert(queueRes.statusCode === 200, "getPendingOrders failed");
    const queueOrders = queueRes.payload?.data?.orders || [];
    const queueIds = new Set(queueOrders.map((o) => String(o._id)));
    assert(
      queueIds.has(String(orderSuccess._id)) && queueIds.has(String(orderCancel._id)),
      "Pending queue missing expected smoke orders"
    );
    log("Cashier queue check passed");

    const payRes = await invokeController(processPayment, {
      params: { orderId: String(orderSuccess._id) },
      body: { paymentReceived: 2005000 },
      user: {
        _id: cashierUser._id,
        role: cashierUser.role,
        fullName: cashierUser.fullName || cashierUser.name || "Cashier",
      },
    });
    assert(payRes.statusCode === 200, "processPayment failed");
    const paidOrder = await Order.findById(orderSuccess._id).lean();
    assert(paidOrder?.statusStage === "DELIVERED", "Paid order stage is not DELIVERED");
    assert(paidOrder?.paymentStatus === "PAID", "Paid order paymentStatus is not PAID");
    log("Cashier payment flow passed");

    const cancelRes = await invokeController(cancelPendingOrder, {
      params: { orderId: String(orderCancel._id) },
      body: { reason: "Phase4 smoke cancel" },
      user: {
        _id: cashierUser._id,
        role: cashierUser.role,
        fullName: cashierUser.fullName || cashierUser.name || "Cashier",
      },
    });
    assert(cancelRes.statusCode === 200, "cancelPendingOrder failed");

    const canceledOrder = await Order.findById(orderCancel._id).lean();
    assert(
      canceledOrder?.statusStage === "CANCELLED",
      "Canceled order stage is not CANCELLED"
    );

    const restoredInventory = await Inventory.findOne({ sku: sku2, locationCode }).lean();
    const restoredLocation = await WarehouseLocation.findOne({ locationCode }).lean();
    assert(restoredInventory?.quantity === 10, "Inventory not restored to expected qty");
    assert(restoredLocation?.currentLoad === 10, "Location load not restored as expected");

    const inboundRestore = await StockMovement.findOne({
      type: "INBOUND",
      referenceType: "ORDER",
      referenceId: String(orderCancel._id),
      sku: sku2,
    }).lean();
    assert(inboundRestore, "Missing inbound restore movement after cashier cancel");
    log("Cashier cancel flow passed");

    log("PHASE 4 preliminary check PASSED");
  } finally {
    // Cleanup temporary records created by this smoke script.
    if (cleanupRefIds.length) {
      await StockMovement.deleteMany({ referenceId: { $in: cleanupRefIds } });
    }
    if (cleanupLocationCodes.length) {
      await Inventory.deleteMany({ locationCode: { $in: cleanupLocationCodes } });
      await WarehouseLocation.deleteMany({
        locationCode: { $in: cleanupLocationCodes },
      });
    }
    if (createdOrderIds.length) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    await mongoose.disconnect();
    log("Cleanup completed");
  }
};

run().catch((error) => {
  console.error("[PHASE4][SMOKE] FAILED", error.message);
  process.exit(1);
});
