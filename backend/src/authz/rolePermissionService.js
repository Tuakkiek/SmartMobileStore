import PermissionTemplate from "../modules/auth/PermissionTemplate.js";
import TemplatePermission from "../modules/auth/TemplatePermission.js";

const DEFAULT_TTL_MS = Number(process.env.AUTHZ_ROLE_CACHE_TTL_MS || 30_000);
const rolePermissionCache = new Map();

const now = () => Date.now();

const isExpired = (entry) => {
  if (!entry) return true;
  return entry.expiresAt <= now();
};

const getCachedValue = (key) => {
  const entry = rolePermissionCache.get(key);
  if (isExpired(entry)) {
    rolePermissionCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedValue = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  rolePermissionCache.set(key, {
    value,
    expiresAt: now() + Math.max(1_000, Number(ttlMs || DEFAULT_TTL_MS)),
  });
  return value;
};

const normalizeRoleKey = (value) => String(value || "").trim().toUpperCase();
const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();
const normalizeScopeType = (value) => String(value || "").trim().toUpperCase();
const normalizeScopeId = (value) => String(value || "").trim();

const loadRolePermissions = async ({ includeInactive = false } = {}) => {
  const templateFilter = includeInactive ? {} : { isActive: true };
  const templates = await PermissionTemplate.find(templateFilter)
    .select("_id key scope isSystem isActive")
    .lean();

  const templateIdToRoleKey = new Map(
    templates.map((template) => [String(template._id), normalizeRoleKey(template.key)])
  );

  const templateIds = Array.from(templateIdToRoleKey.keys());
  const mappings = templateIds.length
    ? await TemplatePermission.find({ templateId: { $in: templateIds } })
        .populate("permissionId", "key scopeType isSensitive isActive")
        .select("templateId permissionId scopeType scopeId")
        .lean()
    : [];

  const roleMap = new Map();
  for (const template of templates) {
    const roleKey = normalizeRoleKey(template.key);
    roleMap.set(roleKey, {
      key: roleKey,
      scope: template.scope || "BRANCH",
      isSystem: Boolean(template.isSystem),
      isActive: Boolean(template.isActive),
      permissions: [],
    });
  }

  for (const row of mappings) {
    const roleKey = templateIdToRoleKey.get(String(row.templateId));
    if (!roleKey) continue;

    const permission = row.permissionId;
    if (!permission) continue;
    if (!includeInactive && permission.isActive === false) continue;

    const entry = roleMap.get(roleKey);
    if (!entry) continue;

    entry.permissions.push({
      key: normalizePermissionKey(permission.key),
      scopeType: normalizeScopeType(row.scopeType || permission.scopeType),
      scopeId: normalizeScopeId(row.scopeId || ""),
      isSensitive: Boolean(permission.isSensitive),
    });
  }

  return roleMap;
};

export const loadRolePermissionMap = async ({ includeInactive = false } = {}) => {
  const cacheKey = includeInactive ? "roles:all" : "roles:active";
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const loaded = await loadRolePermissions({ includeInactive });
  return setCachedValue(cacheKey, loaded, DEFAULT_TTL_MS);
};

export const invalidateRolePermissionCache = () => {
  rolePermissionCache.clear();
};

export default {
  loadRolePermissionMap,
  invalidateRolePermissionCache,
};
