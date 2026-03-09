import Permission from "../modules/auth/Permission.js";
import { AUTHZ_ACTIONS } from "./actions.js";

export const SCOPE_TYPES = Object.freeze({
  GLOBAL: "GLOBAL",
  BRANCH: "BRANCH",
  SELF: "SELF",
});

export const PERMISSION_CATALOG_DEFINITIONS = Object.freeze([
  {
    key: AUTHZ_ACTIONS.ANALYTICS_READ_BRANCH,
    module: "analytics",
    action: "read.branch",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read analytics for active branch",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.ANALYTICS_READ_ASSIGNED,
    module: "analytics",
    action: "read.assigned",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read analytics for assigned branches",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.ANALYTICS_READ_GLOBAL,
    module: "analytics",
    action: "read.global",
    scopeType: SCOPE_TYPES.GLOBAL,
    description: "Read analytics across all branches",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.ANALYTICS_READ_PERSONAL,
    module: "analytics",
    action: "read.personal",
    scopeType: SCOPE_TYPES.SELF,
    description: "Read personal analytics",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.USERS_READ_BRANCH,
    module: "users",
    action: "read.branch",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read users in branch scope",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.USERS_MANAGE_BRANCH,
    module: "users",
    action: "manage.branch",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Create/update users in branch scope",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.USERS_MANAGE_GLOBAL,
    module: "users",
    action: "manage.global",
    scopeType: SCOPE_TYPES.GLOBAL,
    description: "Create/update users across all branches",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.ORDERS_READ,
    module: "orders",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read order data",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.ORDERS_WRITE,
    module: "orders",
    action: "write",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Create or update order data",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.INVENTORY_READ,
    module: "inventory",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read inventory data",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.INVENTORY_WRITE,
    module: "inventory",
    action: "write",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Adjust inventory",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.DEVICE_READ,
    module: "device",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read serialized device data",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.DEVICE_WRITE,
    module: "device",
    action: "write",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Create or update serialized devices",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.WARRANTY_READ,
    module: "warranty",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read warranty records",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.WARRANTY_WRITE,
    module: "warranty",
    action: "write",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Manage warranty records",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.PRODUCT_READ,
    module: "product",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read product catalog",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.PRODUCT_CREATE,
    module: "product",
    action: "create",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Create products",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.PRODUCT_UPDATE,
    module: "product",
    action: "update",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Update products",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.PRODUCT_DELETE,
    module: "product",
    action: "delete",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Delete products",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.WAREHOUSE_READ,
    module: "warehouse",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read warehouse operations",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.WAREHOUSE_WRITE,
    module: "warehouse",
    action: "write",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Operate warehouse processes",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.TRANSFER_CREATE,
    module: "transfer",
    action: "create",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Create stock transfer",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.TRANSFER_APPROVE,
    module: "transfer",
    action: "approve",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Approve stock transfer",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.TRANSFER_SHIP,
    module: "transfer",
    action: "ship",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Ship stock transfer",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.TRANSFER_RECEIVE,
    module: "transfer",
    action: "receive",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Receive stock transfer",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.TRANSFER_READ,
    module: "transfer",
    action: "read",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Read stock transfer",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.STORE_MANAGE,
    module: "store",
    action: "manage",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Manage stores",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.TASK_READ,
    module: "task",
    action: "read",
    scopeType: SCOPE_TYPES.SELF,
    description: "Read assigned task",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.TASK_UPDATE,
    module: "task",
    action: "update",
    scopeType: SCOPE_TYPES.SELF,
    description: "Update assigned task",
    isSensitive: false,
  },
  {
    key: AUTHZ_ACTIONS.CONTEXT_SWITCH_BRANCH,
    module: "context",
    action: "switch.branch",
    scopeType: SCOPE_TYPES.BRANCH,
    description: "Switch active branch context",
    isSensitive: true,
  },
  {
    key: AUTHZ_ACTIONS.CONTEXT_SIMULATE_BRANCH,
    module: "context",
    action: "simulate.branch",
    scopeType: SCOPE_TYPES.GLOBAL,
    description: "Simulate branch context",
    isSensitive: true,
  },
]);

const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();

export const getCatalogDefinitionByKey = () => {
  const map = new Map();
  for (const definition of PERMISSION_CATALOG_DEFINITIONS) {
    map.set(normalizePermissionKey(definition.key), definition);
  }
  return map;
};

export const ensurePermissionCatalogSeeded = async () => {
  if (!PERMISSION_CATALOG_DEFINITIONS.length) {
    return 0;
  }

  const operations = PERMISSION_CATALOG_DEFINITIONS.map((definition) => ({
    updateOne: {
      filter: { key: normalizePermissionKey(definition.key) },
      update: {
        $set: {
          key: normalizePermissionKey(definition.key),
          module: definition.module,
          action: definition.action,
          scopeType: definition.scopeType,
          description: definition.description || "",
          isSensitive: Boolean(definition.isSensitive),
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  await Permission.bulkWrite(operations, { ordered: false });
  return operations.length;
};

export const getPermissionCatalog = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const items = await Permission.find(filter)
    .select("_id key module action scopeType description isSensitive isActive")
    .sort({ module: 1, key: 1 })
    .lean();
  return items;
};

export default {
  SCOPE_TYPES,
  PERMISSION_CATALOG_DEFINITIONS,
  ensurePermissionCatalogSeeded,
  getPermissionCatalog,
  getCatalogDefinitionByKey,
};
