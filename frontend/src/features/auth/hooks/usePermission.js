import { useMemo } from "react";
import { useAuthStore } from "../state/auth.store";

const normalizePermissionKey = (value) => String(value || "").trim().toLowerCase();
const normalizeRoleKey = (value) => String(value || "").trim().toUpperCase();

export const usePermission = (required, options = {}) => {
  const { user, authz } = useAuthStore();

  const permissionSet = useMemo(() => {
    const raw = Array.isArray(authz?.permissions) ? authz.permissions : [];
    return new Set(raw.map(normalizePermissionKey).filter(Boolean));
  }, [authz?.permissions]);

  const requiredKeys = useMemo(() => {
    const list = Array.isArray(required) ? required : required ? [required] : [];
    return list.map(normalizePermissionKey).filter(Boolean);
  }, [required]);

  const isGlobalAdmin = Boolean(
    authz?.isGlobalAdmin || normalizeRoleKey(user?.role) === "GLOBAL_ADMIN"
  );

  if (isGlobalAdmin) return true;
  if (requiredKeys.length === 0) return true;

  if (permissionSet.has("*")) return true;

  const mode = options.mode === "all" ? "all" : "any";
  const hasMatch =
    mode === "all"
      ? requiredKeys.every((key) => permissionSet.has(key))
      : requiredKeys.some((key) => permissionSet.has(key));

  if (hasMatch) return true;

  const hasPermissions = permissionSet.size > 0;
  if (hasPermissions) return false;

  const fallbackRoles = Array.isArray(options.fallbackRoles) ? options.fallbackRoles : [];
  if (!fallbackRoles.length) return false;

  const roleKey = normalizeRoleKey(user?.role);
  return fallbackRoles.map(normalizeRoleKey).includes(roleKey);
};

export default usePermission;
