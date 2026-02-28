import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Order from "../modules/order/Order.js";
import User from "../modules/auth/User.js";
import Store from "../modules/store/Store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (value?._id) return String(value._id).trim();
  return String(value).trim();
};

const isMissingBranchQuery = {
  orderSource: "IN_STORE",
  $or: [
    { "assignedStore.storeId": { $exists: false } },
    { "assignedStore.storeId": null },
  ],
};

const getCandidateUserIds = (order) => {
  const ids = [
    order?.createdByInfo?.userId,
    order?.posInfo?.staffId,
    order?.posInfo?.cashierId,
  ]
    .map(toIdString)
    .filter(Boolean);

  return [...new Set(ids)];
};

const resolveUniqueBranchFromUser = (user) => {
  const activeAssignmentIds = (Array.isArray(user?.branchAssignments) ? user.branchAssignments : [])
    .filter((assignment) => assignment?.status === "ACTIVE")
    .map((assignment) => toIdString(assignment?.storeId))
    .filter(Boolean);

  const distinctAssignmentIds = [...new Set(activeAssignmentIds)];

  if (distinctAssignmentIds.length === 1) {
    return {
      ok: true,
      branchId: distinctAssignmentIds[0],
      source: "branchAssignments",
    };
  }

  if (distinctAssignmentIds.length > 1) {
    return {
      ok: false,
      reason: "MULTIPLE_ACTIVE_BRANCH_ASSIGNMENTS",
      details: distinctAssignmentIds,
    };
  }

  const legacyStoreId = toIdString(user?.storeLocation);
  if (legacyStoreId && mongoose.isValidObjectId(legacyStoreId)) {
    return {
      ok: true,
      branchId: legacyStoreId,
      source: "storeLocation",
    };
  }

  return {
    ok: false,
    reason: "NO_BRANCH_ASSIGNMENT",
  };
};

const formatStoreAddress = (store) => {
  const address = store?.address || {};
  return [address.street, address.ward, address.district, address.province]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

const resolveBranchForOrder = async (order, userCache, storeCache) => {
  const candidateUserIds = getCandidateUserIds(order);

  if (candidateUserIds.length === 0) {
    return {
      ok: false,
      reason: "NO_CANDIDATE_USER",
    };
  }

  const errors = [];

  for (const candidateUserId of candidateUserIds) {
    let user = userCache.get(candidateUserId);
    if (!user) {
      user = await User.findById(candidateUserId)
        .select("_id branchAssignments storeLocation")
        .lean();
      userCache.set(candidateUserId, user || null);
    }

    if (!user) {
      errors.push({ userId: candidateUserId, reason: "USER_NOT_FOUND" });
      continue;
    }

    const branchResolution = resolveUniqueBranchFromUser(user);
    if (!branchResolution.ok) {
      errors.push({
        userId: candidateUserId,
        reason: branchResolution.reason,
        details: branchResolution.details || null,
      });
      continue;
    }

    const branchId = branchResolution.branchId;
    let store = storeCache.get(branchId);
    if (!store) {
      store = await Store.findById(branchId).lean();
      storeCache.set(branchId, store || null);
    }

    if (!store) {
      errors.push({ userId: candidateUserId, reason: "STORE_NOT_FOUND", branchId });
      continue;
    }

    return {
      ok: true,
      branchId,
      sourceUserId: candidateUserId,
      source: branchResolution.source,
      store,
    };
  }

  return {
    ok: false,
    reason: "UNRESOLVED_FROM_CANDIDATES",
    attempts: errors,
  };
};

const run = async () => {
  const startedAt = Date.now();
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();
  console.log("[migrate:instore-order-branch] Connected to MongoDB");

  const orders = await Order.find(isMissingBranchQuery)
    .select("_id orderNumber createdByInfo posInfo createdAt")
    .lean();

  console.log(`[migrate:instore-order-branch] Found ${orders.length} IN_STORE order(s) missing branch`);

  const userCache = new Map();
  const storeCache = new Map();
  const updates = [];
  const unresolved = [];

  for (const order of orders) {
    const resolution = await resolveBranchForOrder(order, userCache, storeCache);

    if (!resolution.ok) {
      unresolved.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber || "",
        reason: resolution.reason,
        attempts: resolution.attempts || [],
      });
      continue;
    }

    const assignedStore = {
      storeId: resolution.store._id,
      storeName: resolution.store.name,
      storeCode: resolution.store.code,
      storeAddress: formatStoreAddress(resolution.store),
      storePhone: resolution.store.phone || "",
      assignedAt: order.createdAt || new Date(),
      assignedBy: resolution.sourceUserId,
    };

    updates.push({
      updateOne: {
        filter: { _id: order._id },
        update: {
          $set: {
            assignedStore,
            "posInfo.storeLocation":
              resolution.store.name || order?.posInfo?.storeLocation || "",
          },
        },
      },
    });
  }

  if (!dryRun && updates.length > 0) {
    const result = await Order.bulkWrite(updates, { ordered: false });
    console.log(
      `[migrate:instore-order-branch] Updated ${result.modifiedCount || 0} order(s) with branch snapshot`,
    );
  } else {
    console.log(`[migrate:instore-order-branch] Dry-run updates prepared: ${updates.length}`);
  }

  if (unresolved.length > 0) {
    const reportDir = path.join(__dirname, "reports");
    fs.mkdirSync(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(reportDir, `instore-order-branch-unresolved-${timestamp}.json`);

    fs.writeFileSync(reportPath, JSON.stringify(unresolved, null, 2), "utf-8");

    console.log(
      `[migrate:instore-order-branch] Unresolved ${unresolved.length} order(s). Report: ${reportPath}`,
    );
    unresolved.forEach((item) => {
      console.log(
        `[migrate:instore-order-branch][UNRESOLVED] orderId=${item.orderId} orderNumber=${item.orderNumber} reason=${item.reason}`,
      );
    });
  } else {
    console.log("[migrate:instore-order-branch] No unresolved order");
  }

  const completedAt = Date.now();
  console.log(
    `[migrate:instore-order-branch] Completed in ${completedAt - startedAt}ms (dryRun=${dryRun})`,
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("[migrate:instore-order-branch] Failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
