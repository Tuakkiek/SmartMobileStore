import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Order from "../modules/order/Order.js";
import AuditLog from "../modules/audit/AuditLog.js";
import { ORDER_AUDIT_ACTIONS } from "../modules/order/orderAuditActions.js";
import { buildOrderAuditSnapshot } from "../modules/order/orderAuditAdapter.js";
import { maskSensitiveData } from "../modules/audit/auditMasking.js";
import { connectDB } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const BATCH_SIZE = 500;

const toStringId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (
    value instanceof mongoose.Types.ObjectId ||
    (typeof value === "object" && typeof value?.toHexString === "function")
  ) {
    return value.toString().trim();
  }
  if (value?._id) return toStringId(value._id);
  return String(value).trim();
};

const toObjectIdOrNull = (value) => {
  const raw = toStringId(value);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
    return null;
  }
  return new mongoose.Types.ObjectId(raw);
};

const processBatch = async ({ orders, dryRun }) => {
  const orderIds = orders.map((order) => toStringId(order._id)).filter(Boolean);
  if (orderIds.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const existing = await AuditLog.find({
    entityType: "ORDER",
    actionType: ORDER_AUDIT_ACTIONS.ORDER_BASELINE,
    entityId: { $in: orderIds },
  })
    .select("entityId")
    .lean();

  const existingIds = new Set(existing.map((entry) => toStringId(entry.entityId)).filter(Boolean));
  const docs = [];

  for (const order of orders) {
    const entityId = toStringId(order._id);
    if (!entityId || existingIds.has(entityId)) {
      continue;
    }

    const snapshot = buildOrderAuditSnapshot(order);
    docs.push({
      entityType: "ORDER",
      entityId,
      orderId: toObjectIdOrNull(order._id),
      branchId: toObjectIdOrNull(order?.assignedStore?.storeId),
      actionType: ORDER_AUDIT_ACTIONS.ORDER_BASELINE,
      outcome: "SUCCESS",
      actor: {
        actorType: "SYSTEM",
        userId: null,
        role: "SYSTEM",
        source: "BASELINE_MIGRATION",
      },
      oldValues: {},
      newValues: maskSensitiveData(snapshot || {}),
      changedPaths: [],
      note: "Order baseline audit snapshot",
      reason: "",
      requestContext: {},
      failureContext: {},
      metadata: {
        migration: "migrate-order-audit-baseline",
      },
    });
  }

  if (docs.length === 0) {
    return { inserted: 0, skipped: orderIds.length };
  }

  if (dryRun) {
    return { inserted: docs.length, skipped: orderIds.length - docs.length };
  }

  await AuditLog.insertMany(docs, { ordered: false });
  return { inserted: docs.length, skipped: orderIds.length - docs.length };
};

const run = async () => {
  const startedAt = Date.now();
  const dryRun = process.argv.includes("--dry-run");

  let scanned = 0;
  let inserted = 0;
  let skipped = 0;

  await connectDB();
  console.log("[migrate:order-audit-baseline] Connected to MongoDB");

  const cursor = Order.find({})
    .select(
      "_id orderNumber orderSource fulfillmentType status statusStage paymentMethod paymentStatus subtotal shippingFee discount promotionDiscount total totalAmount cancelReason notes note confirmedAt shippedAt deliveredAt cancelledAt trackingNumber shippingProvider shippingAddress assignedStore shipperInfo pickerInfo carrierAssignment posInfo createdByInfo vatInvoice onlineInvoice paymentInfo items"
    )
    .lean()
    .cursor();

  let buffer = [];
  for await (const order of cursor) {
    scanned += 1;
    buffer.push(order);

    if (buffer.length >= BATCH_SIZE) {
      const result = await processBatch({ orders: buffer, dryRun });
      inserted += result.inserted;
      skipped += result.skipped;
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    const result = await processBatch({ orders: buffer, dryRun });
    inserted += result.inserted;
    skipped += result.skipped;
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[migrate:order-audit-baseline] Completed dryRun=${dryRun} scanned=${scanned} inserted=${inserted} skipped=${skipped} durationMs=${durationMs}`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("[migrate:order-audit-baseline] Failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
