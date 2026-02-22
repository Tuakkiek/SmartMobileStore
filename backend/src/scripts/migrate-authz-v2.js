import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../modules/auth/User.js";
import Order from "../modules/order/Order.js";
import { connectDB } from "../config/db.js";
import { deriveAuthzWriteFromLegacyInput } from "../authz/userAccessResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const toDistinctManagedBranchIds = async (userId) => {
  return Order.distinct("assignedStore.storeId", {
    "createdByInfo.userId": userId,
    "assignedStore.storeId": { $exists: true, $ne: null },
  });
};

const normalizeId = (value) => (value ? String(value) : "");

const shouldSkipUser = (user) => {
  const hasV2 =
    (Array.isArray(user.systemRoles) && user.systemRoles.length > 0) ||
    (Array.isArray(user.taskRoles) && user.taskRoles.length > 0) ||
    (Array.isArray(user.branchAssignments) && user.branchAssignments.length > 0);
  return hasV2 && user.authzVersion >= 2;
};

const buildAuthzFromLegacy = async (user) => {
  const legacyRole = String(user.role || "").toUpperCase();
  const base = deriveAuthzWriteFromLegacyInput({
    role: legacyRole,
    storeLocation: user.storeLocation,
  });

  if (legacyRole !== "ADMIN" || user.storeLocation) {
    return base;
  }

  const managedBranchIds = (await toDistinctManagedBranchIds(user._id)).map(normalizeId).filter(Boolean);

  if (managedBranchIds.length > 1) {
    return {
      systemRoles: ["GLOBAL_ADMIN"],
      taskRoles: [],
      branchAssignments: [],
      authzState: "ACTIVE",
      adminResolution: "GLOBAL_BY_MULTI_BRANCH_ACTIVITY",
    };
  }

  if (managedBranchIds.length === 1) {
    return {
      systemRoles: [],
      taskRoles: [],
      branchAssignments: [
        {
          storeId: managedBranchIds[0],
          roles: ["BRANCH_ADMIN"],
          status: "ACTIVE",
          isPrimary: true,
          assignedBy: user._id,
        },
      ],
      authzState: "ACTIVE",
      adminResolution: "BRANCH_BY_ACTIVITY",
    };
  }

  return {
    ...base,
    authzState: "REVIEW_REQUIRED",
    adminResolution: "AMBIGUOUS_REVIEW_REQUIRED",
  };
};

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  await connectDB();
  console.log("Connected to DB");

  const users = await User.find({}).lean();
  const summary = {
    total: users.length,
    skipped: 0,
    updated: 0,
    reviewRequired: 0,
    adminGlobal: 0,
    adminBranch: 0,
  };

  for (const user of users) {
    if (!force && shouldSkipUser(user)) {
      summary.skipped += 1;
      continue;
    }

    const mapped = await buildAuthzFromLegacy(user);
    const updateDoc = {
      authzVersion: 2,
      systemRoles: mapped.systemRoles || [],
      taskRoles: mapped.taskRoles || [],
      branchAssignments: mapped.branchAssignments || [],
      authzState: mapped.authzState || "ACTIVE",
      permissionsVersion: Number(user.permissionsVersion || 1) + 1,
    };

    if (mapped.authzState === "REVIEW_REQUIRED") {
      summary.reviewRequired += 1;
    }
    if (mapped.adminResolution === "GLOBAL_BY_MULTI_BRANCH_ACTIVITY") {
      summary.adminGlobal += 1;
    }
    if (mapped.adminResolution === "BRANCH_BY_ACTIVITY") {
      summary.adminBranch += 1;
    }

    if (dryRun) {
      console.log(`[DRY-RUN] ${user._id} ->`, updateDoc);
      summary.updated += 1;
      continue;
    }

    await User.updateOne({ _id: user._id }, { $set: updateDoc });
    summary.updated += 1;
  }

  console.log("Migration summary:", summary);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
