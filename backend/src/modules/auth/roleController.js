import PermissionTemplate from "./PermissionTemplate.js";
import TemplatePermission from "./TemplatePermission.js";
import Permission from "./Permission.js";
import { invalidateRolePermissionCache } from "../../authz/rolePermissionService.js";
import { clearPermissionCache } from "../../authz/effectivePermissionCache.js";

const normalizeRoleKey = (value) => String(value || "").trim().toUpperCase();
const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();

const invalidateAuthzCaches = () => {
  invalidateRolePermissionCache();
  clearPermissionCache();
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return Boolean(value);
};

const resolvePermissionDocs = async (permissionKeys = []) => {
  const normalizedKeys = Array.from(
    new Set(permissionKeys.map((key) => normalizePermissionKey(key)).filter(Boolean))
  );
  if (!normalizedKeys.length) {
    return [];
  }

  const permissions = await Permission.find({ key: { $in: normalizedKeys }, isActive: true })
    .select("_id key scopeType isSensitive isActive")
    .lean();

  const foundKeys = new Set(permissions.map((permission) => normalizePermissionKey(permission.key)));
  const missing = normalizedKeys.filter((key) => !foundKeys.has(key));

  if (missing.length) {
    const error = new Error(`Unknown permission keys: ${missing.join(", ")}`);
    error.code = "ROLE_PERMISSION_KEYS_INVALID";
    error.status = 400;
    throw error;
  }

  return permissions;
};

const applyTemplatePermissions = async ({ templateId, permissions = [] }) => {
  await TemplatePermission.deleteMany({ templateId });
  if (!permissions.length) {
    return;
  }

  const mappings = permissions.map((permission, index) => ({
    templateId,
    permissionId: permission._id,
    scopeType: permission.scopeType,
    scopeId: "",
    sortOrder: index,
    metadata: {
      source: "ROLE_MANUAL",
    },
  }));

  await TemplatePermission.insertMany(mappings, { ordered: false });
};

const buildPermissionsByTemplate = async ({ templateIds, includeInactive = false }) => {
  const mappings = templateIds.length
    ? await TemplatePermission.find({ templateId: { $in: templateIds } })
        .populate("permissionId", "key isActive")
        .select("templateId permissionId sortOrder")
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean()
    : [];

  const byTemplateId = new Map();
  for (const row of mappings) {
    const permission = row.permissionId;
    if (!permission) continue;
    if (!includeInactive && permission.isActive === false) continue;

    const templateId = String(row.templateId);
    if (!byTemplateId.has(templateId)) {
      byTemplateId.set(templateId, []);
    }
    byTemplateId.get(templateId).push(normalizePermissionKey(permission.key));
  }

  return byTemplateId;
};

const buildRolePayload = ({ template, permissionKeys = [] }) => ({
  id: String(template._id),
  key: normalizeRoleKey(template.key),
  name: template.name,
  description: template.description || "",
  scope: template.scope || "BRANCH",
  isSystem: Boolean(template.isSystem),
  isActive: Boolean(template.isActive),
  metadata: template.metadata || {},
  permissions: permissionKeys,
});

export const listRoles = async (req, res) => {
  try {
    const includeInactive = toBoolean(req.query.includeInactive);
    const templateFilter = includeInactive ? {} : { isActive: true };

    const templates = await PermissionTemplate.find(templateFilter)
      .select("_id key name description scope isSystem isActive metadata")
      .sort({ isSystem: -1, key: 1 })
      .lean();

    const templateIds = templates.map((template) => template._id);
    const permissionMap = await buildPermissionsByTemplate({
      templateIds,
      includeInactive,
    });

    const roles = templates.map((template) =>
      buildRolePayload({
        template,
        permissionKeys: permissionMap.get(String(template._id)) || [],
      })
    );

    return res.json({
      success: true,
      data: { roles },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "ROLE_LIST_FAILED",
      message: error.message,
    });
  }
};

export const getRole = async (req, res) => {
  try {
    const roleKey = normalizeRoleKey(req.params.key);
    const template = await PermissionTemplate.findOne({ key: roleKey }).lean();
    if (!template) {
      return res.status(404).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message: "Role not found",
      });
    }

    const permissionMap = await buildPermissionsByTemplate({
      templateIds: [template._id],
      includeInactive: true,
    });

    return res.json({
      success: true,
      data: {
        role: buildRolePayload({
          template,
          permissionKeys: permissionMap.get(String(template._id)) || [],
        }),
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      code: "ROLE_LOAD_FAILED",
      message: error.message,
    });
  }
};

export const createRole = async (req, res) => {
  try {
    const { key, name, description, scope, isActive, permissions } = req.body || {};
    if (!key || !name || !scope) {
      return res.status(400).json({
        success: false,
        code: "ROLE_PAYLOAD_INVALID",
        message: "key, name, and scope are required",
      });
    }

    const normalizedKey = normalizeRoleKey(key);
    const existing = await PermissionTemplate.findOne({ key: normalizedKey }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        code: "ROLE_KEY_EXISTS",
        message: "Role key already exists",
      });
    }

    const permissionDocs = await resolvePermissionDocs(permissions || []);

    const template = await PermissionTemplate.create({
      key: normalizedKey,
      name: String(name).trim(),
      description: String(description || "").trim(),
      scope: String(scope).trim().toUpperCase(),
      isActive: isActive === undefined ? true : Boolean(isActive),
      isSystem: false,
      metadata: {
        source: "CUSTOM_ROLE",
      },
    });

    await applyTemplatePermissions({
      templateId: template._id,
      permissions: permissionDocs,
    });

    invalidateAuthzCaches();

    return res.status(201).json({
      success: true,
      data: {
        role: buildRolePayload({
          template,
          permissionKeys: permissionDocs.map((permission) => normalizePermissionKey(permission.key)),
        }),
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      code: error.code || "ROLE_CREATE_FAILED",
      message: error.message,
    });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { key, name, description, scope, isActive, permissions } = req.body || {};
    const roleKey = normalizeRoleKey(req.params.key);

    if (!name || !scope) {
      return res.status(400).json({
        success: false,
        code: "ROLE_PAYLOAD_INVALID",
        message: "name and scope are required",
      });
    }

    if (key && normalizeRoleKey(key) !== roleKey) {
      return res.status(400).json({
        success: false,
        code: "ROLE_KEY_IMMUTABLE",
        message: "Role key cannot be changed",
      });
    }

    const template = await PermissionTemplate.findOne({ key: roleKey });
    if (!template) {
      return res.status(404).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message: "Role not found",
      });
    }

    template.name = String(name).trim();
    template.description = String(description || "").trim();
    template.scope = String(scope).trim().toUpperCase();
    if (isActive !== undefined) {
      template.isActive = Boolean(isActive);
    }

    const permissionDocs = await resolvePermissionDocs(permissions || []);
    await applyTemplatePermissions({
      templateId: template._id,
      permissions: permissionDocs,
    });

    await template.save();
    invalidateAuthzCaches();

    return res.json({
      success: true,
      data: {
        role: buildRolePayload({
          template,
          permissionKeys: permissionDocs.map((permission) => normalizePermissionKey(permission.key)),
        }),
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      code: error.code || "ROLE_UPDATE_FAILED",
      message: error.message,
    });
  }
};

export const patchRole = async (req, res) => {
  try {
    const roleKey = normalizeRoleKey(req.params.key);
    const template = await PermissionTemplate.findOne({ key: roleKey });
    if (!template) {
      return res.status(404).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message: "Role not found",
      });
    }

    const payload = req.body || {};
    if (payload.key && normalizeRoleKey(payload.key) !== roleKey) {
      return res.status(400).json({
        success: false,
        code: "ROLE_KEY_IMMUTABLE",
        message: "Role key cannot be changed",
      });
    }

    if (payload.name !== undefined) {
      template.name = String(payload.name).trim();
    }
    if (payload.description !== undefined) {
      template.description = String(payload.description || "").trim();
    }
    if (payload.scope !== undefined) {
      template.scope = String(payload.scope).trim().toUpperCase();
    }
    if (payload.isActive !== undefined) {
      template.isActive = Boolean(payload.isActive);
    }

    let permissionKeys = null;
    if (payload.permissions !== undefined) {
      const permissionDocs = await resolvePermissionDocs(payload.permissions || []);
      await applyTemplatePermissions({
        templateId: template._id,
        permissions: permissionDocs,
      });
      permissionKeys = permissionDocs.map((permission) => normalizePermissionKey(permission.key));
    }

    await template.save();
    invalidateAuthzCaches();

    return res.json({
      success: true,
      data: {
        role: buildRolePayload({
          template,
          permissionKeys:
            permissionKeys ||
            (await buildPermissionsByTemplate({
              templateIds: [template._id],
              includeInactive: true,
            })).get(String(template._id)) || [],
        }),
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      code: error.code || "ROLE_PATCH_FAILED",
      message: error.message,
    });
  }
};
