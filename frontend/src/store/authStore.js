import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "@/lib/api";

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

const normalizeAllowedBranchIds = (authz) => {
  const allowed = Array.isArray(authz?.allowedBranchIds) ? authz.allowedBranchIds : [];
  return [...new Set(allowed.map(normalizeBranchId).filter(Boolean))];
};

const isGlobalAdminContext = (user, authz) => {
  return Boolean(authz?.isGlobalAdmin || String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN");
};

const isBranchScopedStaff = (user, authz) => {
  if (isGlobalAdminContext(user, authz)) return false;
  if (authz?.requiresBranchAssignment === true) return true;
  return BRANCH_SCOPED_ROLES.has(String(user?.role || "").toUpperCase());
};

const deriveFixedBranchId = (user, authz) => {
  const allowedBranchIds = normalizeAllowedBranchIds(authz);
  const authzActiveBranchId = normalizeBranchId(authz?.activeBranchId);

  if (authzActiveBranchId) {
    if (allowedBranchIds.length === 0 || allowedBranchIds.includes(authzActiveBranchId)) {
      return authzActiveBranchId;
    }
  }

  if (allowedBranchIds.length > 0) {
    return allowedBranchIds[0];
  }

  const legacyStoreLocation = normalizeBranchId(user?.storeLocation);
  if (legacyStoreLocation) {
    return legacyStoreLocation;
  }

  return "";
};

const resolveActiveBranchId = ({ user, authz, currentActiveBranchId = "" }) => {
  const fixedBranchId = deriveFixedBranchId(user, authz);

  if (isBranchScopedStaff(user, authz)) {
    return fixedBranchId || null;
  }

  if (isGlobalAdminContext(user, authz)) {
    const current = normalizeBranchId(currentActiveBranchId);
    return current || fixedBranchId || null;
  }

  const current = normalizeBranchId(currentActiveBranchId);
  return current || fixedBranchId || null;
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      activeBranchId: null,
      authz: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { user, token, authz } = response.data.data;

          const activeBranchId = resolveActiveBranchId({
            user,
            authz,
            currentActiveBranchId: null,
          });

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            activeBranchId,
            authz: authz || null,
          });

          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || "Dang nhap that bai";
          set({
            error: message,
            isLoading: false,
            isAuthenticated: false,
          });
          return { success: false, message };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.register(data);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || "Dang ky that bai";
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
            activeBranchId: null,
            authz: null,
          });
        }
      },

      getCurrentUser: async () => {
        const token = get().token;

        if (!token) {
          return { success: false };
        }

        try {
          const response = await authAPI.getCurrentUser();
          const { user, authz } = response.data.data;

          const activeBranchId = resolveActiveBranchId({
            user,
            authz,
            currentActiveBranchId: get().activeBranchId,
          });

          set({
            user,
            isAuthenticated: true,
            activeBranchId,
            authz: authz || get().authz,
          });
          return { success: true };
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            activeBranchId: null,
            authz: null,
          });
          return { success: false };
        }
      },

      setActiveBranch: (branchId) => {
        const { user, authz } = get();
        if (!isGlobalAdminContext(user, authz)) {
          return;
        }

        set({ activeBranchId: normalizeBranchId(branchId) || null });
      },

      changePassword: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.changePassword(data);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || "Doi mat khau that bai";
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        activeBranchId: state.activeBranchId,
        authz: state.authz,
      }),
    },
  ),
);
