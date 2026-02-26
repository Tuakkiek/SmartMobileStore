// FILE: frontend/src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── KILL-SWITCH: Branch context fields ──
      activeBranchId: null,
      authz: null,

      // Login
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { user, token, authz } = response.data.data;

          // ── KILL-SWITCH: Extract active branch ──
          const activeBranchId =
            authz?.activeBranchId ||
            user?.storeLocation ||
            (authz?.allowedBranchIds && authz.allowedBranchIds.length > 0 ? authz.allowedBranchIds[0] : null);

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
          const message = error.response?.data?.message || 'Đăng nhập thất bại';
          set({
            error: message,
            isLoading: false,
            isAuthenticated: false
          });
          return { success: false, message };
        }
      },

      // Register
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.register(data);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Đăng ký thất bại';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      // Logout
      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
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

      // Get current user (để refresh thông tin user)
      getCurrentUser: async () => {
        const token = get().token;

        if (!token) {
          return { success: false };
        }

        try {
          const response = await authAPI.getCurrentUser();
          const { user, authz } = response.data.data;

          // ── KILL-SWITCH: Refresh authz context ──
          const currentActiveBranch = get().activeBranchId;
          const activeBranchId =
            currentActiveBranch ||
            authz?.activeBranchId ||
            user?.storeLocation ||
            (authz?.allowedBranchIds && authz.allowedBranchIds.length > 0 ? authz.allowedBranchIds[0] : null);

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

      // ── KILL-SWITCH: Switch active branch ──
      setActiveBranch: (branchId) => {
        set({ activeBranchId: branchId || null });
      },

      // Change password
      changePassword: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.changePassword(data);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Đổi mật khẩu thất bại';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage', // Key trong localStorage
      // Chỉ persist những field cần thiết
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        activeBranchId: state.activeBranchId,
        authz: state.authz,
      })
    }
  )
);