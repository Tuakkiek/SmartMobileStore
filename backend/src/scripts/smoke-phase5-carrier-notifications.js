import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../modules/auth/User.js";
import Order from "../modules/order/Order.js";
import Notification from "../modules/notification/Notification.js";
import {
  updateOrderStatus,
  assignCarrier,
  handleCarrierWebhook,
} from "../modules/order/orderController.js";

dotenv.config();

const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_CONNECTIONSTRING ||
  process.env.MONGO_URL;
const MONGO_URI = rawMongoUri?.trim().replace(/^"|"$/g, "");

if (!MONGO_URI) {
  console.error("[PHASE5][SMOKE] Missing MONGO_URI/MONGODB_URI");
  process.exit(1);
}

const log = (...args) => console.log("[PHASE5][SMOKE]", ...args);

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

const buildManagerReqUser = (user) => ({
  _id: user._id,
  role: user.role,
  fullName: user.fullName || user.name || "Manager",
});

const run = async () => {
  let createdOrderId = null;

  try {
    await mongoose.connect(MONGO_URI);
    log("Mongo connected");

    const managerUser =
      (await User.findOne({ role: "ORDER_MANAGER" }).select("_id role fullName name")) ||
      (await User.findOne({ role: "ADMIN" }).select("_id role fullName name"));

    assert(managerUser, "No ORDER_MANAGER/ADMIN user found");

    const shipperUser = await User.findOne({ role: "SHIPPER" }).select(
      "_id role fullName name phoneNumber"
    );

    const nowSuffix = Date.now();
    const order = await Order.create({
      orderNumber: `PH5-SMOKE-${nowSuffix}`,
      orderSource: "ONLINE",
      fulfillmentType: "HOME_DELIVERY",
      customerId: managerUser._id,
      userId: managerUser._id,
      shippingAddress: {
        fullName: "Phase5 Smoke Customer",
        phoneNumber: "0900000000",
        detailAddress: "Smoke test address",
      },
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      status: "PENDING",
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          variantId: new mongoose.Types.ObjectId(),
          productType: "UNIVERSAL",
          productName: "Phase5 Smoke Product",
          quantity: 1,
          price: 1500000,
        },
      ],
      subtotal: 1500000,
      shippingFee: 0,
      totalAmount: 1500000,
    });

    createdOrderId = order._id;
    log("Smoke order created", order.orderNumber);

    const confirmRes = await invokeController(updateOrderStatus, {
      params: { id: String(order._id) },
      body: { status: "CONFIRMED", note: "Phase5 smoke confirm" },
      user: buildManagerReqUser(managerUser),
    });
    assert(confirmRes.statusCode === 200, "updateOrderStatus(CONFIRMED) failed");

    const confirmedOrder = await Order.findById(order._id).lean();
    assert(confirmedOrder?.statusStage === "CONFIRMED", "Order stage is not CONFIRMED");

    const confirmedNotis = await Notification.countDocuments({
      orderId: order._id,
      eventType: { $in: ["ORDER_CONFIRMED", "WAREHOUSE_NEW_CONFIRMED_ORDER"] },
    });
    assert(confirmedNotis >= 2, "Missing CONFIRMED notifications");
    log("CONFIRMED notifications check passed");

    const assignBody = {
      trackingNumber: `PH5-TRACK-${nowSuffix}`,
      carrierCode: "GHN",
      carrierName: "GHN Express",
      note: "Phase5 smoke assign carrier",
    };
    if (shipperUser?._id) {
      assignBody.shipperId = String(shipperUser._id);
    }

    const assignRes = await invokeController(assignCarrier, {
      params: { id: String(order._id) },
      body: assignBody,
      user: buildManagerReqUser(managerUser),
    });
    assert(assignRes.statusCode === 200, "assignCarrier failed");

    const assignedOrder = await Order.findById(order._id).lean();
    assert(
      assignedOrder?.carrierAssignment?.trackingNumber === assignBody.trackingNumber,
      "Carrier tracking number not saved"
    );
    log("assign-carrier check passed");

    const webhookHeaders = process.env.CARRIER_WEBHOOK_TOKEN
      ? { "x-carrier-token": process.env.CARRIER_WEBHOOK_TOKEN }
      : {};

    const inTransitRes = await invokeController(handleCarrierWebhook, {
      headers: webhookHeaders,
      body: {
        eventId: `PH5-EVENT-INTRANSIT-${nowSuffix}`,
        eventType: "IN_TRANSIT",
        orderId: String(order._id),
        trackingNumber: assignBody.trackingNumber,
        note: "Carrier picked and shipping",
      },
    });
    assert(inTransitRes.statusCode === 200, "carrier webhook IN_TRANSIT failed");

    const inTransitOrder = await Order.findById(order._id).lean();
    assert(inTransitOrder?.statusStage === "IN_TRANSIT", "Order stage is not IN_TRANSIT");

    const inTransitNotis = await Notification.countDocuments({
      orderId: order._id,
      eventType: "ORDER_IN_TRANSIT",
    });
    assert(inTransitNotis >= 1, "Missing ORDER_IN_TRANSIT notification");
    log("IN_TRANSIT webhook check passed");

    const deliveredEventId = `PH5-EVENT-DELIVERED-${nowSuffix}`;
    const deliveredRes = await invokeController(handleCarrierWebhook, {
      headers: webhookHeaders,
      body: {
        eventId: deliveredEventId,
        status: "DELIVERED",
        orderId: String(order._id),
        trackingNumber: assignBody.trackingNumber,
        proof: {
          proofType: "PHOTO",
          signedBy: "Smoke Receiver",
          photos: ["https://example.com/proof.jpg"],
          note: "Delivered successfully",
        },
      },
    });
    assert(deliveredRes.statusCode === 200, "carrier webhook DELIVERED failed");

    const deliveredOrder = await Order.findById(order._id).lean();
    assert(deliveredOrder?.statusStage === "DELIVERED", "Order stage is not DELIVERED");
    assert(
      Array.isArray(deliveredOrder?.deliveryProof?.photos) &&
        deliveredOrder.deliveryProof.photos.length === 1,
      "Delivery proof was not stored"
    );

    const deliveredNotis = await Notification.countDocuments({
      orderId: order._id,
      eventType: "ORDER_DELIVERED",
    });
    assert(deliveredNotis >= 1, "Missing ORDER_DELIVERED notification");
    log("DELIVERED webhook check passed");

    const duplicateRes = await invokeController(handleCarrierWebhook, {
      headers: webhookHeaders,
      body: {
        eventId: deliveredEventId,
        status: "DELIVERED",
        orderId: String(order._id),
        trackingNumber: assignBody.trackingNumber,
      },
    });
    assert(duplicateRes.statusCode === 200, "duplicate webhook should return 200");
    assert(
      duplicateRes.payload?.duplicated === true,
      "Duplicate webhook was not detected as duplicated"
    );
    log("Webhook idempotency check passed");

    log("PHASE 5 smoke check PASSED");
  } finally {
    if (createdOrderId) {
      await Notification.deleteMany({ orderId: createdOrderId });
      await Order.deleteOne({ _id: createdOrderId });
    }
    await mongoose.disconnect();
    log("Cleanup completed");
  }
};

run().catch((error) => {
  console.error("[PHASE5][SMOKE] FAILED", error.message);
  process.exit(1);
});
