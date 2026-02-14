import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import qs from "qs";

import Order from "../modules/order/Order.js";
import { vnpayIPN, vnpayReturn } from "../modules/payment/vnpayController.js";

dotenv.config();

const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_CONNECTIONSTRING ||
  process.env.MONGO_URL;
const MONGO_URI = rawMongoUri?.trim().replace(/^"|"$/g, "");

const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || "phase6-test-secret";
process.env.VNP_HASH_SECRET = VNP_HASH_SECRET;

if (!MONGO_URI) {
  console.error("[PHASE6][VNPAY] Missing MONGO_URI/MONGODB_URI");
  process.exit(1);
}

const log = (...args) => console.log("[PHASE6][VNPAY]", ...args);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

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

const buildSignedQuery = (params) => ({
  ...params,
  vnp_SecureHash: signVnpParams(params),
});

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

const buildOrderPayload = ({ orderNumber, totalAmount, txnRef, customerId }) => ({
  orderNumber,
  orderSource: "ONLINE",
  fulfillmentType: "HOME_DELIVERY",
  customerId,
  userId: customerId,
  shippingAddress: {
    fullName: "Phase6 VNPay Customer",
    phoneNumber: "0900000000",
    detailAddress: "Phase6 VNPay integration test",
  },
  paymentMethod: "VNPAY",
  paymentStatus: "PENDING",
  status: "PENDING_PAYMENT",
  items: [
    {
      productId: new mongoose.Types.ObjectId(),
      variantId: new mongoose.Types.ObjectId(),
      productType: "UNIVERSAL",
      productName: "VNPay Test Product",
      quantity: 1,
      price: totalAmount,
    },
  ],
  subtotal: totalAmount,
  shippingFee: 0,
  totalAmount,
  paymentInfo: {
    vnpayTxnRef: txnRef,
    vnpayCreatedAt: new Date(),
  },
});

const run = async () => {
  const createdOrderIds = [];

  try {
    await mongoose.connect(MONGO_URI);
    log("Mongo connected");

    const customerId = new mongoose.Types.ObjectId();
    const suffix = Date.now();

    const successOrder = await Order.create(
      buildOrderPayload({
        orderNumber: `PH6-VNPAY-SUCCESS-${suffix}`,
        totalAmount: 2300000,
        txnRef: `${new mongoose.Types.ObjectId()}${suffix}`,
        customerId,
      })
    );
    createdOrderIds.push(successOrder._id);

    const successQuery = buildSignedQuery({
      vnp_TxnRef: successOrder.paymentInfo.vnpayTxnRef,
      vnp_ResponseCode: "00",
      vnp_Amount: String(successOrder.totalAmount * 100),
      vnp_TransactionNo: `TXN-SUCCESS-${suffix}`,
      vnp_BankCode: "NCB",
      vnp_CardType: "ATM",
    });

    const successIpnRes = await invokeController(vnpayIPN, {
      query: { ...successQuery },
    });
    assert(successIpnRes.statusCode === 200, "Success IPN did not return HTTP 200");
    assert(successIpnRes.payload?.RspCode === "00", "Success IPN did not confirm success");

    const successOrderAfter = await Order.findById(successOrder._id).lean();
    assert(successOrderAfter?.paymentStatus === "PAID", "Success order paymentStatus is not PAID");
    assert(successOrderAfter?.status === "PENDING", "Success order status is not PENDING");
    assert(successOrderAfter?.statusStage === "PENDING", "Success order statusStage is not PENDING");
    assert(
      Boolean(successOrderAfter?.paymentInfo?.vnpayVerified),
      "Success order missing vnpayVerified"
    );
    assert(
      Boolean(successOrderAfter?.onlineInvoice?.invoiceNumber),
      "Success order missing auto-generated online invoice"
    );

    const historyLenAfterSuccess = Array.isArray(successOrderAfter?.statusHistory)
      ? successOrderAfter.statusHistory.length
      : 0;

    const successIpnResDuplicate = await invokeController(vnpayIPN, {
      query: { ...successQuery },
    });
    assert(
      successIpnResDuplicate.payload?.RspCode === "00",
      "Duplicate success IPN did not return success"
    );

    const successOrderAfterDuplicate = await Order.findById(successOrder._id).lean();
    const historyLenAfterDuplicate = Array.isArray(successOrderAfterDuplicate?.statusHistory)
      ? successOrderAfterDuplicate.statusHistory.length
      : 0;
    assert(
      historyLenAfterDuplicate === historyLenAfterSuccess,
      "Duplicate success IPN changed history unexpectedly"
    );

    const returnRes = await invokeController(vnpayReturn, {
      query: { ...successQuery },
    });
    assert(returnRes.statusCode === 200, "VNPay return for success did not return HTTP 200");
    assert(returnRes.payload?.success === true, "VNPay return did not report success=true");
    assert(returnRes.payload?.paymentVerified === true, "VNPay return missing paymentVerified");

    const failureOrder = await Order.create(
      buildOrderPayload({
        orderNumber: `PH6-VNPAY-FAIL-${suffix}`,
        totalAmount: 1700000,
        txnRef: `${new mongoose.Types.ObjectId()}${suffix + 1}`,
        customerId,
      })
    );
    createdOrderIds.push(failureOrder._id);

    const failureQuery = buildSignedQuery({
      vnp_TxnRef: failureOrder.paymentInfo.vnpayTxnRef,
      vnp_ResponseCode: "24",
      vnp_Amount: String(failureOrder.totalAmount * 100),
      vnp_TransactionNo: `TXN-FAIL-${suffix}`,
      vnp_BankCode: "NCB",
      vnp_CardType: "ATM",
    });

    const failureIpnRes = await invokeController(vnpayIPN, {
      query: { ...failureQuery },
    });
    assert(failureIpnRes.statusCode === 200, "Failure IPN did not return HTTP 200");
    assert(failureIpnRes.payload?.RspCode === "00", "Failure IPN did not return confirm success");

    const failureOrderAfter = await Order.findById(failureOrder._id).lean();
    assert(failureOrderAfter?.paymentStatus === "FAILED", "Failure order paymentStatus is not FAILED");
    assert(
      failureOrderAfter?.status === "PAYMENT_FAILED",
      "Failure order status is not PAYMENT_FAILED"
    );
    assert(
      failureOrderAfter?.statusStage === "PAYMENT_FAILED",
      "Failure order statusStage is not PAYMENT_FAILED"
    );
    assert(
      String(failureOrderAfter?.paymentFailureReason || "").includes("VNPAY_24"),
      "Failure order paymentFailureReason missing VNPAY error code"
    );

    const invalidSignatureRes = await invokeController(vnpayIPN, {
      query: {
        ...successQuery,
        vnp_SecureHash: "invalid_signature",
      },
    });
    assert(
      invalidSignatureRes.payload?.RspCode === "97",
      "Invalid signature should return VNPay code 97"
    );

    log("VNPay integration checks passed");
  } finally {
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    await mongoose.disconnect();
    log("Cleanup completed");
  }
};

run().catch((error) => {
  console.error("[PHASE6][VNPAY] FAILED", error.message);
  process.exit(1);
});
