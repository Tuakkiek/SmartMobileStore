import Permission from "../modules/auth/Permission.js";
import PermissionTemplate from "../modules/auth/PermissionTemplate.js";
import TemplatePermission from "../modules/auth/TemplatePermission.js";
import { ROLE_PERMISSIONS, SYSTEM_ROLES, BRANCH_ROLES, TASK_ROLES } from "./actions.js";
import { ensurePermissionCatalogSeeded } from "./permissionCatalog.js";

const SYSTEM_TEMPLATE_METADATA = Object.freeze({
  GLOBAL_ADMIN: {
    name: "Global Admin",
    description: "Full access across all modules and branches",
  },
  ADMIN: {
    name: "Branch Admin (Legacy Admin)",
    description: "Full branch operations and staff management in branch scope",
  },
  BRANCH_ADMIN: {
    name: "Branch Admin",
    description: "Full branch operations and staff management in branch scope",
  },
  WAREHOUSE_MANAGER: {
    name: "Warehouse Manager",
    description: "Warehouse operations, inventory, and transfer approvals",
  },
  WAREHOUSE_STAFF: {
    name: "Warehouse Staff",
    description: "Warehouse handling and inventory execution tasks",
  },
  PRODUCT_MANAGER: {
    name: "Product Manager",
    description: "Product catalog and inventory read controls",
  },
  ORDER_MANAGER: {
    name: "Order Manager",
    description: "Order lifecycle management and branch analytics",
  },
  POS_STAFF: {
    name: "POS Staff",
    description: "Point-of-sale operations and personal analytics",
  },
  CASHIER: {
    name: "Cashier",
    description: "Checkout operations and personal analytics",
  },
  SHIPPER: {
    name: "Shipper",
    description: "Assigned shipment tasks and personal analytics",
  },
});

const normalizeTemplateKey = (value) => String(value || "").trim().toUpperCase();
const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();

const roleKeys = Object.keys(ROLE_PERMISSIONS);

const resolveTemplateScope = (roleKey) => {
  const normalized = normalizeTemplateKey(roleKey);
  if (SYSTEM_ROLES.includes(normalized)) return "SYSTEM";
  if (TASK_ROLES.includes(normalized)) return "TASK";
  if (BRANCH_ROLES.includes(normalized)) return "BRANCH";
  return "BRANCH";
};

const getTemplatePayload = (roleKey) => {
  const metadata = SYSTEM_TEMPLATE_METADATA[roleKey] || {
    name: roleKey,
    description: `${roleKey} permission template`,
  };

  return {
    key: normalizeTemplateKey(roleKey),
    name: metadata.name,
    description: metadata.description,
    scope: resolveTemplateScope(roleKey),
    isSystem: true,
    isActive: true,
    metadata: {
      roleKey: normalizeTemplateKey(roleKey),
    },
  };
};

export const ensurePermissionTemplatesSeeded = async () => {
  await ensurePermissionCatalogSeeded();

  if (!roleKeys.length) {
    return 0;
  }

  const templateOps = roleKeys.map((roleKey) => ({
    updateOne: {
      filter: { key: normalizeTemplateKey(roleKey) },
      update: {
        $set: getTemplatePayload(roleKey),
      },
      upsert: true,
    },
  }));
  await PermissionTemplate.bulkWrite(templateOps, { ordered: false });

  const templates = await PermissionTemplate.find({
    key: { $in: roleKeys.map(normalizeTemplateKey) },
  })
    .select("_id key scope")
    .lean();

  const templateIdByKey = new Map(
    templates.map((item) => [normalizeTemplateKey(item.key), String(item._id)])
  );

  const permissionKeys = new Set();
  for (const roleKey of roleKeys) {
    for (const permission of ROLE_PERMISSIONS[roleKey] || []) {
      if (permission === "*") continue;
      permissionKeys.add(normalizePermissionKey(permission));
    }
  }

  const permissionRows = await Permission.find({
    key: { $in: Array.from(permissionKeys) },
  })
    .select("_id key scopeType")
    .lean();

  const permissionByKey = new Map(
    permissionRows.map((row) => [normalizePermissionKey(row.key), row])
  );

  const templateIds = Array.from(templateIdByKey.values());
  if (templateIds.length) {
    await TemplatePermission.deleteMany({
      templateId: { $in: templateIds },
      "metadata.source": "SYSTEM_ROLE_TEMPLATE",
    });
  }

  const mappingDocs = [];
  for (const roleKey of roleKeys) {
    const templateId = templateIdByKey.get(normalizeTemplateKey(roleKey));
    if (!templateId) continue;

    const rolePermissions = ROLE_PERMISSIONS[roleKey] || [];
    let sortOrder = 0;
    for (const rawPermission of rolePermissions) {
      if (rawPermission === "*") {
        for (const row of permissionRows) {
          mappingDocs.push({
            templateId,
            permissionId: row._id,
            scopeType: row.scopeType,
            scopeId: "",
            sortOrder,
            metadata: {
              source: "SYSTEM_ROLE_TEMPLATE",
              roleKey: normalizeTemplateKey(roleKey),
            },
          });
          sortOrder += 1;
        }
        continue;
      }

      const permission = permissionByKey.get(normalizePermissionKey(rawPermission));
      if (!permission) continue;

      mappingDocs.push({
        templateId,
        permissionId: permission._id,
        scopeType: permission.scopeType,
        scopeId: "",
        sortOrder,
        metadata: {
          source: "SYSTEM_ROLE_TEMPLATE",
          roleKey: normalizeTemplateKey(roleKey),
        },
      });
      sortOrder += 1;
    }
  }

  if (mappingDocs.length) {
    await TemplatePermission.insertMany(mappingDocs, { ordered: false });
  }

  return templateOps.length;
};

export const getPermissionTemplates = async ({ includeInactive = false } = {}) => {
  const templateFilter = includeInactive ? {} : { isActive: true };
  const templates = await PermissionTemplate.find(templateFilter)
    .select("_id key name description scope isSystem isActive metadata")
    .sort({ isSystem: -1, key: 1 })
    .lean();

  const templateIds = templates.map((template) => template._id);
  const mappings = templateIds.length
    ? await TemplatePermission.find({ templateId: { $in: templateIds } })
        .populate("permissionId", "key module action scopeType isSensitive")
        .select("templateId permissionId scopeType scopeId sortOrder")
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean()
    : [];

  const permissionsByTemplateId = new Map();
  for (const row of mappings) {
    const templateId = String(row.templateId);
    if (!permissionsByTemplateId.has(templateId)) {
      permissionsByTemplateId.set(templateId, []);
    }

    const permission = row.permissionId;
    if (!permission) continue;

    permissionsByTemplateId.get(templateId).push({
      key: permission.key,
      module: permission.module,
      action: permission.action,
      scopeType: row.scopeType || permission.scopeType,
      scopeId: row.scopeId || "",
      isSensitive: Boolean(permission.isSensitive),
    });
  }

  return templates.map((template) => ({
    ...template,
    permissions: permissionsByTemplateId.get(String(template._id)) || [],
  }));
};

export default {
  ensurePermissionTemplatesSeeded,
  getPermissionTemplates,
};
