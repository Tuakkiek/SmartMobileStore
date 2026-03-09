import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";
import { Loading } from "@/shared/ui/Loading";

const ProtectedRoute = ({ children, allowedRoles, allowedPermissions }) => {
  const { isAuthenticated, user, authz, rehydrating } = useAuthStore();

  if (rehydrating) return <Loading />;
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;

  if (user?.role === "GLOBAL_ADMIN" || authz?.isGlobalAdmin) {
    return children;
  }

  if (allowedPermissions && allowedPermissions.length > 0) {
    const permissionSet = new Set(Array.isArray(authz?.permissions) ? authz.permissions : []);
    const hasAnyPermission =
      permissionSet.has("*") ||
      allowedPermissions.some((permission) => permissionSet.has(permission));

    if (!hasAnyPermission) {
      return <Navigate to="/" replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
