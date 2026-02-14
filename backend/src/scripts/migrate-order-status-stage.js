import mongoose from "mongoose";
import dotenv from "dotenv";
import Order, { mapStatusToStage } from "../modules/order/Order.js";

dotenv.config();

const BATCH_SIZE = 500;

const connectDB = async () => {
  const uri = process.env.MONGODB_CONNECTIONSTRING;
  if (!uri) {
    throw new Error("Missing MONGODB_CONNECTIONSTRING");
  }

  await mongoose.connect(uri);
  console.log("[MIGRATE][ORDER_STAGE] MongoDB connected");
};

const summarizeByField = async (field) => {
  const rows = await Order.aggregate([
    {
      $group: {
        _id: `$${field}`,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    key: row._id ?? "NULL",
    count: row.count,
  }));
};

const printSummary = async (label) => {
  const [statusSummary, stageSummary] = await Promise.all([
    summarizeByField("status"),
    summarizeByField("statusStage"),
  ]);

  console.log(`\n[MIGRATE][ORDER_STAGE] ${label}`);
  console.log("[MIGRATE][ORDER_STAGE] status distribution:");
  for (const row of statusSummary) {
    console.log(`  - ${row.key}: ${row.count}`);
  }

  console.log("[MIGRATE][ORDER_STAGE] statusStage distribution:");
  for (const row of stageSummary) {
    console.log(`  - ${row.key}: ${row.count}`);
  }
};

const buildStageHistory = (statusHistory, fallbackUserId, fallbackStage, fallbackDate) => {
  if (!Array.isArray(statusHistory) || statusHistory.length === 0) {
    return [
      {
        stage: fallbackStage,
        updatedBy: fallbackUserId || undefined,
        updatedAt: fallbackDate || new Date(),
        note: "Backfilled initial status stage",
      },
    ];
  }

  const stageHistory = [];

  for (const entry of statusHistory) {
    const stage = mapStatusToStage(entry?.status);
    const previous = stageHistory[stageHistory.length - 1];

    if (previous?.stage === stage) {
      continue;
    }

    stageHistory.push({
      stage,
      updatedBy: entry?.updatedBy || fallbackUserId || undefined,
      updatedAt: entry?.updatedAt || fallbackDate || new Date(),
      note: entry?.note || `Backfilled from status ${entry?.status || "UNKNOWN"}`,
    });
  }

  if (stageHistory.length === 0) {
    stageHistory.push({
      stage: fallbackStage,
      updatedBy: fallbackUserId || undefined,
      updatedAt: fallbackDate || new Date(),
      note: "Backfilled initial status stage",
    });
  }

  return stageHistory;
};

const hasFailedPaymentSignal = (order) => {
  const paymentInfo = order?.paymentInfo || {};
  const responseCode = paymentInfo?.vnpayResponseCode;
  const responseIndicatesFailure = Boolean(responseCode && responseCode !== "00");

  return (
    order?.paymentStatus === "FAILED" ||
    paymentInfo?.vnpayFailed === true ||
    responseIndicatesFailure
  );
};

const buildUpdateDoc = (order) => {
  const fallbackUserId = order?.customerId || order?.userId || undefined;
  const now = new Date();
  const setPayload = {};
  let pushStatusHistory = null;

  const failedPayment = hasFailedPaymentSignal(order);
  const shouldMarkPaymentFailed = order?.status === "PENDING_PAYMENT" && failedPayment;

  if (shouldMarkPaymentFailed) {
    setPayload.status = "PAYMENT_FAILED";
    const latestStatus = Array.isArray(order.statusHistory)
      ? order.statusHistory[order.statusHistory.length - 1]
      : null;

    if (latestStatus?.status !== "PAYMENT_FAILED") {
      pushStatusHistory = {
        status: "PAYMENT_FAILED",
        updatedBy: latestStatus?.updatedBy || fallbackUserId,
        updatedAt: latestStatus?.updatedAt || order?.updatedAt || now,
        note: "Backfilled from failed payment metadata",
      };
    }
  }

  const effectiveStatus = setPayload.status || order?.status;
  const mappedStage = mapStatusToStage(effectiveStatus);

  if (order?.statusStage !== mappedStage) {
    setPayload.statusStage = mappedStage;
  }

  const hasStageHistory =
    Array.isArray(order?.statusStageHistory) && order.statusStageHistory.length > 0;
  if (!hasStageHistory) {
    setPayload.statusStageHistory = buildStageHistory(
      order?.statusHistory,
      fallbackUserId,
      mappedStage,
      order?.createdAt || now
    );
  }

  if (failedPayment) {
    if (!order?.paymentFailureAt) {
      setPayload.paymentFailureAt = order?.updatedAt || now;
    }

    if (!order?.paymentFailureReason) {
      const reasonCode =
        order?.paymentInfo?.vnpayFailReason ||
        order?.paymentInfo?.vnpayResponseCode ||
        "PAYMENT_FAILED";
      setPayload.paymentFailureReason = String(reasonCode);
    }

    if (order?.paymentStatus !== "FAILED") {
      setPayload.paymentStatus = "FAILED";
    }
  }

  const updateDoc = {};
  if (Object.keys(setPayload).length > 0) {
    updateDoc.$set = setPayload;
  }

  if (pushStatusHistory) {
    updateDoc.$push = { statusHistory: pushStatusHistory };
  }

  return Object.keys(updateDoc).length > 0 ? updateDoc : null;
};

const run = async () => {
  const startedAt = Date.now();
  let scanned = 0;
  let updated = 0;
  let failed = 0;
  let operations = [];

  try {
    await connectDB();
    await printSummary("Before migration");

    const cursor = Order.find(
      {},
      {
        _id: 1,
        status: 1,
        statusHistory: 1,
        statusStage: 1,
        statusStageHistory: 1,
        paymentStatus: 1,
        paymentInfo: 1,
        paymentFailureAt: 1,
        paymentFailureReason: 1,
        customerId: 1,
        userId: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    )
      .lean()
      .cursor();

    for await (const order of cursor) {
      scanned += 1;
      const updateDoc = buildUpdateDoc(order);

      if (!updateDoc) {
        continue;
      }

      operations.push({
        updateOne: {
          filter: { _id: order._id },
          update: updateDoc,
        },
      });

      if (operations.length >= BATCH_SIZE) {
        const result = await Order.bulkWrite(operations, { ordered: false });
        updated += result.modifiedCount || 0;
        operations = [];
      }
    }

    if (operations.length > 0) {
      const result = await Order.bulkWrite(operations, { ordered: false });
      updated += result.modifiedCount || 0;
    }

    await printSummary("After migration");

    const durationMs = Date.now() - startedAt;
    console.log("\n[MIGRATE][ORDER_STAGE] Completed");
    console.log(`[MIGRATE][ORDER_STAGE] scanned=${scanned} updated=${updated} failed=${failed}`);
    console.log(`[MIGRATE][ORDER_STAGE] durationMs=${durationMs}`);
  } catch (error) {
    failed += 1;
    console.error("[MIGRATE][ORDER_STAGE] Failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
