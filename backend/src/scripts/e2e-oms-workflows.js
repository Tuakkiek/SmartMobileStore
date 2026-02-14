import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import qs from "qs";

import User from "../modules/auth/User.js";
import Order from "../modules/order/Order.js";
import {
  assignCarrier,
  handleCarrierWebhook,
  updateOrderStatus,
} from "../modules/order/orderController.js";
import { cancelPendingOrder, processPayment } from "../modules/order/posController.js";
import { vnpayIPN } from "../modules/payment/vnpayController.js";

dotenv.config();

const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_CONNECTIONSTRING ||
  process.env.MONGO_URL;
const MONGO_URI = rawMongoUri?.trim().replace(/^"|"$/g, "");

const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || "phase6-e2e-secret";
process.env.VNP_HASH_SECRET = VNP_HASH_SECRET;

if (!MONGO_URI) {
  console.error("[PHASE6][E2E] Missing MONGO_URI/MONGODB_URI");
  process.exit(1);
}

const log = (...args) => console.log("[PHASE6][E2E]", ...args);

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

const managerReqUser = (user) => ({
  _id: user._id,
  role: user.role,
  fullName: user.fullName || user.name || "Manager",
});

const cashierReqUser = (user) => ({
  _id: user._id,
  role: user.role,
  fullName: user.fullName || user.name || "Cashier",
});

const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj)
    .filter((key) => Object.prototype.hasOwnProperty.call(obj, key))
    .map((key) => encodeURIComponent(key))
    .sort();

  for (const encodedKey of keys) {
    const originalKey = decodeURIComponent(encodedKey);
    sorted[encodedKey] = encodeURIComponent(obj[originalKey]).replace(/%20/g, "+");
  }

  return sorted;
};

const signVnpParams = (params) => {
  const sorted = sortObject(params);
  const signData = qs.stringify(sorted, { encode: false });
  const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
  return hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
};

const buildSignedVnpQuery = (params) => ({
  ...params,
  vnp_SecureHash: signVnpParams(params),
});

const createBaseOrder = ({
  orderNumber,
  orderSource,
  fulfillmentType,
  customerId,
  paymentMethod,
  paymentStatus,
  status,
  totalAmount,
}) => ({
  orderNumber,
  orderSource,
  fulfillmentType,
  customerId,
  userId: customerId,
  shippingAddress: {
    fullName: "Phase6 E2E Customer",
    phoneNumber: "0900000000",
    detailAddress: "Phase6 E2E flow",
  },
  paymentMethod,
  paymentStatus,
  status,
  items: [
    {
      productId: new mongoose.Types.ObjectId(),
      variantId: new mongoose.Types.ObjectId(),
      productType: "UNIVERSAL",
      productName: "Phase6 E2E Product",
      quantity: 1,
      price: totalAmount,
    },
  ],
  subtotal: totalAmount,
  shippingFee: 0,
  totalAmount,
});

const run = async () => {
  const createdOrderIds = [];

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

    const now = Date.now();

    // 1) COD online flow
    const codOrder = await Order.create(
      createBaseOrder({
        orderNumber: `PH6-E2E-COD-${now}`,
        orderSource: "ONLINE",
        fulfillmentType: "HOME_DELIVERY",
        customerId: managerUser._id,
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        status: "PENDING",
        totalAmount: 1900000,
      })
    );
    createdOrderIds.push(codOrder._id);

    const codStatuses = ["CONFIRMED", "PICKING", "PICKUP_COMPLETED"];
    for (const status of codStatuses) {
      const statusRes = await invokeController(updateOrderStatus, {
        params: { id: String(codOrder._id) },
        body: { status, note: `Phase6 COD ${status}` },
        user: managerReqUser(managerUser),
      });
      assert(statusRes.statusCode === 200, `COD flow failed to move to ${status}`);
    }

    const trackingNumber = `PH6-COD-TRACK-${now}`;
    const assignRes = await invokeController(assignCarrier, {
      params: { id: String(codOrder._id) },
      body: {
        carrierCode: "GHN",
        carrierName: "GHN Express",
        trackingNumber,
        note: "Phase6 COD assign carrier",
      },
      user: managerReqUser(managerUser),
    });
    assert(assignRes.statusCode === 200, "COD flow assignCarrier failed");

    const shippingRes = await invokeController(updateOrderStatus, {
      params: { id: String(codOrder._id) },
      body: { status: "SHIPPING", note: "Phase6 COD shipping" },
      user: managerReqUser(managerUser),
    });
    assert(shippingRes.statusCode === 200, "COD flow failed to move to SHIPPING");

    const webhookHeaders = process.env.CARRIER_WEBHOOK_TOKEN
      ? { "x-carrier-token": process.env.CARRIER_WEBHOOK_TOKEN }
      : {};
    const deliveredRes = await invokeController(handleCarrierWebhook, {
      headers: webhookHeaders,
      body: {
        eventId: `PH6-COD-DELIVERED-${now}`,
        status: "DELIVERED",
        orderId: String(codOrder._id),
        trackingNumber,
        proof: {
          proofType: "PHOTO",
          signedBy: "Phase6 Receiver",
          photos: ["https://example.com/phase6-proof.jpg"],
          note: "Delivered in Phase6 E2E flow",
        },
      },
    });
    assert(deliveredRes.statusCode === 200, "COD carrier webhook DELIVERED failed");

    const codOrderAfter = await Order.findById(codOrder._id).lean();
    assert(codOrderAfter?.statusStage === "DELIVERED", "COD flow stage is not DELIVERED");
    assert(
      Array.isArray(codOrderAfter?.deliveryProof?.photos) &&
        codOrderAfter.deliveryProof.photos.length > 0,
      "COD flow delivery proof missing"
    );
    log("COD online flow passed");

    // 2) VNPay flow (success + failure)
    const vnpSuccessOrder = await Order.create({
      ...createBaseOrder({
        orderNumber: `PH6-E2E-VNPAY-SUCCESS-${now}`,
        orderSource: "ONLINE",
        fulfillmentType: "HOME_DELIVERY",
        customerId: managerUser._id,
        paymentMethod: "VNPAY",
        paymentStatus: "PENDING",
        status: "PENDING_PAYMENT",
        totalAmount: 2100000,
      }),
      paymentInfo: {
        vnpayTxnRef: `${new mongoose.Types.ObjectId()}${now}`,
      },
    });
    createdOrderIds.push(vnpSuccessOrder._id);

    const vnpSuccessQuery = buildSignedVnpQuery({
      vnp_TxnRef: vnpSuccessOrder.paymentInfo.vnpayTxnRef,
      vnp_ResponseCode: "00",
      vnp_Amount: String(vnpSuccessOrder.totalAmount * 100),
      vnp_TransactionNo: `PH6-VNP-S-${now}`,
      vnp_BankCode: "NCB",
      vnp_CardType: "ATM",
    });

    const vnpSuccessRes = await invokeController(vnpayIPN, {
      query: { ...vnpSuccessQuery },
    });
    assert(vnpSuccessRes.statusCode === 200, "VNPay success IPN failed");

    const vnpSuccessAfter = await Order.findById(vnpSuccessOrder._id).lean();
    assert(
      vnpSuccessAfter?.paymentStatus === "PAID" && vnpSuccessAfter?.statusStage === "PENDING",
      "VNPay success flow did not return order to PENDING stage"
    );

    const vnpFailOrder = await Order.create({
      ...createBaseOrder({
        orderNumber: `PH6-E2E-VNPAY-FAIL-${now}`,
        orderSource: "ONLINE",
        fulfillmentType: "HOME_DELIVERY",
        customerId: managerUser._id,
        paymentMethod: "VNPAY",
        paymentStatus: "PENDING",
        status: "PENDING_PAYMENT",
        totalAmount: 1800000,
      }),
      paymentInfo: {
        vnpayTxnRef: `${new mongoose.Types.ObjectId()}${now + 1}`,
      },
    });
    createdOrderIds.push(vnpFailOrder._id);

    const vnpFailQuery = buildSignedVnpQuery({
      vnp_TxnRef: vnpFailOrder.paymentInfo.vnpayTxnRef,
      vnp_ResponseCode: "24",
      vnp_Amount: String(vnpFailOrder.totalAmount * 100),
      vnp_TransactionNo: `PH6-VNP-F-${now}`,
      vnp_BankCode: "NCB",
      vnp_CardType: "ATM",
    });

    const vnpFailRes = await invokeController(vnpayIPN, {
      query: { ...vnpFailQuery },
    });
    assert(vnpFailRes.statusCode === 200, "VNPay failure IPN failed");

    const vnpFailAfter = await Order.findById(vnpFailOrder._id).lean();
    assert(
      vnpFailAfter?.paymentStatus === "FAILED" &&
        vnpFailAfter?.statusStage === "PAYMENT_FAILED",
      "VNPay failure flow did not set PAYMENT_FAILED stage"
    );
    log("VNPay flow passed");

    // 3) POS flow (paid + canceled at cashier)
    const posPaidOrder = await Order.create(
      createBaseOrder({
        orderNumber: `PH6-E2E-POS-PAID-${now}`,
        orderSource: "IN_STORE",
        fulfillmentType: "IN_STORE",
        customerId: managerUser._id,
        paymentMethod: "CASH",
        paymentStatus: "UNPAID",
        status: "CONFIRMED",
        totalAmount: 1200000,
      })
    );
    createdOrderIds.push(posPaidOrder._id);

    for (const status of ["PICKING", "PICKUP_COMPLETED", "PENDING_PAYMENT"]) {
      const statusRes = await invokeController(updateOrderStatus, {
        params: { id: String(posPaidOrder._id) },
        body: { status, note: `Phase6 POS paid ${status}` },
        user: managerReqUser(managerUser),
      });
      assert(statusRes.statusCode === 200, `POS paid flow failed at ${status}`);
    }

    const posPayRes = await invokeController(processPayment, {
      params: { orderId: String(posPaidOrder._id) },
      body: { paymentReceived: 1205000 },
      user: cashierReqUser(cashierUser),
    });
    assert(posPayRes.statusCode === 200, "POS payment flow failed at cashier");

    const posPaidAfter = await Order.findById(posPaidOrder._id).lean();
    assert(
      posPaidAfter?.statusStage === "DELIVERED" && posPaidAfter?.paymentStatus === "PAID",
      "POS paid flow did not end in DELIVERED + PAID"
    );

    const posCancelOrder = await Order.create(
      createBaseOrder({
        orderNumber: `PH6-E2E-POS-CANCEL-${now}`,
        orderSource: "IN_STORE",
        fulfillmentType: "IN_STORE",
        customerId: managerUser._id,
        paymentMethod: "CASH",
        paymentStatus: "UNPAID",
        status: "CONFIRMED",
        totalAmount: 900000,
      })
    );
    createdOrderIds.push(posCancelOrder._id);

    for (const status of ["PICKING", "PICKUP_COMPLETED", "PENDING_PAYMENT"]) {
      const statusRes = await invokeController(updateOrderStatus, {
        params: { id: String(posCancelOrder._id) },
        body: { status, note: `Phase6 POS cancel ${status}` },
        user: managerReqUser(managerUser),
      });
      assert(statusRes.statusCode === 200, `POS cancel flow failed at ${status}`);
    }

    const posCancelRes = await invokeController(cancelPendingOrder, {
      params: { orderId: String(posCancelOrder._id) },
      body: { reason: "Phase6 POS cancel flow" },
      user: cashierReqUser(cashierUser),
    });
    assert(posCancelRes.statusCode === 200, "POS cancel flow failed at cashier");

    const posCancelAfter = await Order.findById(posCancelOrder._id).lean();
    assert(posCancelAfter?.statusStage === "CANCELLED", "POS cancel flow did not end in CANCELLED");
    log("POS flow passed");

    log("All OMS E2E workflows passed");
  } finally {
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    await mongoose.disconnect();
    log("Cleanup completed");
  }
};

run().catch((error) => {
  console.error("[PHASE6][E2E] FAILED", error.message);
  process.exit(1);
});
