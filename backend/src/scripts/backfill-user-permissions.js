import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import User from "../modules/auth/User.js";
import Permission from "../modules/auth/Permission.js";
import UserPermission from "../modules/auth/UserPermission.js";
import { normalizeUserAccess } from "../authz/userAccessResolver.js";
import { ROLE_PERMISSIONS } from "../authz/actions.js";
import { ensurePermissionCatalogSeeded } from "../authz/permissionCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();
const normalizeScopeType = (value) => String(value || "").trim().toUpperCase();
const normalizeScopeId = (value) => String(value || "").trim();

const toGrantKey = ({ key, scopeType, scopeId }) =>
  `${normalizePermissionKey(key)}|${normalizeScopeType(scopeType)}|${normalizeScopeId(scopeId)}`;

const toUniqueStrings = (items = []) =>
  Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));

const buildRoleDerivedGrants = ({ user, catalogByKey }) => {
  const normalized = normalizeUserAccess(user);
  const grants = new Map();
  const userId = normalizeScopeId(user?._id);

  const addGrant = ({ key, scopeType, scopeId }) => {
    const normalizedKey = normalizePermissionKey(key);
    if (!normalizedKey) return;
    const normalizedScope = normalizeScopeType(scopeType);
    const normalizedScopeIdValue = normalizedScope === "GLOBAL" ? "" : normalizeScopeId(scopeId);
    const dedupeKey = toGrantKey({
      key: normalizedKey,
      scopeType: normalizedScope,
      scopeId: normalizedScopeIdValue,
    });
    grants.set(dedupeKey, {
      key: normalizedKey,
      scopeType: normalizedScope,
      scopeId: normalizedScopeIdValue,
    });
  };

  const addRolePermissions = ({ role, branchId = "", forceGlobal = false }) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    for (const permissionKey of rolePermissions) {
      if (permissionKey === "*") {
        for (const catalog of catalogByKey.values()) {
          addGrant({
            key: catalog.key,
            scopeType: forceGlobal ? "GLOBAL" : catalog.scopeType,
            scopeId:
              forceGlobal || catalog.scopeType === "GLOBAL"
                ? ""
                : catalog.scopeType === "BRANCH"
                  ? branchId
                  : userId,
          });
        }
        continue;
      }

      const catalog = catalogByKey.get(normalizePermissionKey(permissionKey));
      if (!catalog) continue;

      const scopeType = forceGlobal ? "GLOBAL" : catalog.scopeType;
      addGrant({
        key: catalog.key,
        scopeType,
        scopeId:
          scopeType === "GLOBAL"
            ? ""
            : scopeType === "BRANCH"
              ? branchId
              : userId,
      });
    }
  };

  const hasGlobalAdminRole = (normalized.systemRoles || []).includes("GLOBAL_ADMIN");
  if (hasGlobalAdminRole) {
    addRolePermissions({ role: "GLOBAL_ADMIN", forceGlobal: true });
  } else {
    for (const role of normalized.systemRoles || []) {
      addRolePermissions({ role });
    }
  }

  for (const role of normalized.taskRoles || []) {
    addRolePermissions({ role });
  }

  for (const assignment of normalized.branchAssignments || []) {
    if (String(assignment.status || "ACTIVE").toUpperCase() !== "ACTIVE") {
      continue;
    }

    const branchId = normalizeScopeId(assignment.storeId);
    for (const role of assignment.roles || []) {
      addRolePermissions({ role, branchId });
    }
  }

  return Array.from(grants.values());
};

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  await connectDB();
  await ensurePermissionCatalogSeeded();

  const catalogRows = await Permission.find({ isActive: true })
    .select("_id key scopeType")
    .lean();
  const catalogByKey = new Map(
    catalogRows.map((row) => [
      normalizePermissionKey(row.key),
      {
        id: String(row._id),
        key: normalizePermissionKey(row.key),
        scopeType: row.scopeType,
      },
    ])
  );

  const users = await User.find({}).select("_id role permissionsVersion systemRoles taskRoles branchAssignments").lean();
  const summary = {
    totalUsers: users.length,
    skippedExisting: 0,
    updatedUsers: 0,
    totalGrantedRows: 0,
    totalRevokedRows: 0,
  };

  for (const user of users) {
    const userId = String(user._id);

    const existingActiveRows = await UserPermission.find({
      userId,
      status: "ACTIVE",
    })
      .select("_id")
      .lean();

    if (!force && existingActiveRows.length > 0) {
      summary.skippedExisting += 1;
      continue;
    }

    const grants = buildRoleDerivedGrants({
      user,
      catalogByKey,
    });

    const grantRows = grants
      .map((grant) => {
        const catalog = catalogByKey.get(grant.key);
        if (!catalog) return null;
        return {
          userId,
          permissionId: catalog.id,
          scopeType: grant.scopeType,
          scopeId: grant.scopeId,
          status: "ACTIVE",
          grantedBy: null,
          grantedAt: new Date(),
          metadata: {
            source: "ROLE_BACKFILL",
            migratedAt: new Date().toISOString(),
          },
        };
      })
      .filter(Boolean);

    if (dryRun) {
      console.log("[DRY-RUN]", {
        userId,
        role: user.role,
        existingActive: existingActiveRows.length,
        grantRows: grantRows.length,
      });
      summary.updatedUsers += 1;
      summary.totalGrantedRows += grantRows.length;
      summary.totalRevokedRows += existingActiveRows.length;
      continue;
    }

    if (existingActiveRows.length > 0) {
      await UserPermission.updateMany(
        { _id: { $in: existingActiveRows.map((row) => row._id) } },
        {
          $set: {
            status: "REVOKED",
            revokedBy: null,
            revokedAt: new Date(),
            revokeReason: "role_permission_backfill",
          },
        }
      );
    }

    if (grantRows.length > 0) {
      await UserPermission.insertMany(grantRows, { ordered: false });
    }

    if (existingActiveRows.length > 0 || grantRows.length > 0) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            permissionsVersion: Number(user.permissionsVersion || 1) + 1,
            permissionMode: "EXPLICIT",
          },
        }
      );
    }

    summary.updatedUsers += 1;
    summary.totalGrantedRows += grantRows.length;
    summary.totalRevokedRows += existingActiveRows.length;
  }

  console.log("User permission backfill summary", summary);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("User permission backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
