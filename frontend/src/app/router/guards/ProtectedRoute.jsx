import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore, usePermission } from "@/features/auth";
import { Loading } from "@/shared/ui/Loading";

const ProtectedRoute = ({ children, allowedRoles, allowedPermissions }) => {
  const { isAuthenticated, user, authz, rehydrating } = useAuthStore();
  const hasAllowedPermission = usePermission(allowedPermissions || [], {
    mode: "any",
    fallbackRoles: Array.isArray(allowedRoles) ? allowedRoles : [],
  });
  const hasRoleRules = Array.isArray(allowedRoles) && allowedRoles.length > 0;
  const hasPermissionRules =
    Array.isArray(allowedPermissions) && allowedPermissions.length > 0;

  if (rehydrating) return <Loading />;
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;

  if (user?.role === "GLOBAL_ADMIN" || authz?.isGlobalAdmin) {
    return children;
  }

  const roleAllowed = hasRoleRules ? allowedRoles.includes(user.role) : false;
  const permissionAllowed = hasPermissionRules ? hasAllowedPermission : false;

  if (!hasRoleRules && !hasPermissionRules) {
    return children;
  }

  if (!(roleAllowed || permissionAllowed)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
