import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const BRANCH_SCOPED_ROLES = new Set([
  "ADMIN",
  "BRANCH_ADMIN",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "POS_STAFF",
  "CASHIER",
]);

const normalizeBranchId = (value) => {
  if (!value) return "";
  return String(value).trim();
};

const toAllowedBranchIds = (authz) => {
  const raw = Array.isArray(authz?.allowedBranchIds) ? authz.allowedBranchIds : [];
  return [...new Set(raw.map(normalizeBranchId).filter(Boolean))];
};

const isGlobalAdminState = (state) => {
  const role = String(state?.user?.role || "").toUpperCase();
  return Boolean(state?.authz?.isGlobalAdmin || role === "GLOBAL_ADMIN");
};

const isBranchScopedStaffState = (state) => {
  if (isGlobalAdminState(state)) return false;

  if (state?.authz?.requiresBranchAssignment === true) {
    return true;
  }

  const role = String(state?.user?.role || "").toUpperCase();
  return BRANCH_SCOPED_ROLES.has(role);
};

const deriveFixedBranchIdFromState = (state) => {
  const allowedBranchIds = toAllowedBranchIds(state?.authz);
  const authzActiveBranchId = normalizeBranchId(state?.authz?.activeBranchId);

  if (authzActiveBranchId) {
    if (allowedBranchIds.length === 0 || allowedBranchIds.includes(authzActiveBranchId)) {
      return authzActiveBranchId;
    }
  }

  if (allowedBranchIds.length > 0) {
    return allowedBranchIds[0];
  }

  return normalizeBranchId(state?.user?.storeLocation);
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        const allowedBranchIds = toAllowedBranchIds(state?.authz);
        const fixedBranchId = deriveFixedBranchIdFromState(state);
        const mutableBranchId = normalizeBranchId(state?.activeBranchId);
        const contextMode = String(
          state?.contextMode || state?.authz?.contextMode || "STANDARD",
        )
          .trim()
          .toUpperCase();
        const simulatedBranchId = normalizeBranchId(
          state?.simulatedBranchId || state?.authz?.simulatedBranchId,
        );

        let activeBranchId = "";
        if (isBranchScopedStaffState(state)) {
          activeBranchId = fixedBranchId;
        } else if (
          isGlobalAdminState(state) &&
          contextMode === "SIMULATED" &&
          simulatedBranchId
        ) {
          activeBranchId = simulatedBranchId;
        } else if (mutableBranchId) {
          activeBranchId = mutableBranchId;
        } else {
          activeBranchId = fixedBranchId;
        }

        if (
          activeBranchId &&
          allowedBranchIds.length > 0 &&
          !allowedBranchIds.includes(activeBranchId) &&
          !isGlobalAdminState(state)
        ) {
          activeBranchId = fixedBranchId;
        }

        if (activeBranchId) {
          config.headers["X-Active-Branch-Id"] = activeBranchId;
        }

        if (
          isGlobalAdminState(state) &&
          contextMode === "SIMULATED" &&
          simulatedBranchId
        ) {
          config.headers["X-Simulate-Branch-Id"] = simulatedBranchId;
        } else if (config.headers["X-Simulate-Branch-Id"]) {
          delete config.headers["X-Simulate-Branch-Id"];
        }
      } catch (error) {
        console.error("Error parsing auth-storage:", error);
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !String(error.config?.url || "").includes("/auth/login")
    ) {
      localStorage.removeItem("auth-storage");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
