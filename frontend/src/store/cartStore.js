// ============================================
// FILE: src/store/cartStore.js
// FIXED: Thiếu variantId hoặc productType
// ============================================

import { create } from "zustand";
import { cartAPI } from "@/lib/api";

export const useCartStore = create((set, get) => ({
  cart: { items: [] },
  isLoading: false,
  error: null,

  // Get cart
  getCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.getCart();
      set({ cart: response.data.data, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false });
    }
  },

  // FIXED: addToCart - BẮT BUỘC variantId + productType
  addToCart: async (variantId, quantity = 1, productType) => {
    // VALIDATE TRƯỚC KHI GỌI API
    if (!variantId || !productType) {
      const message = "Thiếu variantId hoặc productType";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    if (!["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"].includes(productType)) {
      const message = "productType không hợp lệ";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.addToCart({
        variantId,
        quantity,
        productType, // ĐẢM BẢO GỬI
      });
      set({ cart: response.data.data, isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || "Thêm vào giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  updateCartItem: async (variantId, quantity) => {
    if (!variantId || quantity < 1) {
      return { success: false };
    }

    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.updateItem({ variantId, quantity });
      set({ cart: response.data.data, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Cập nhật giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  removeFromCart: async (variantId) => {
    if (!variantId) {
      return { success: false };
    }

    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.removeItem(variantId);
      set({ cart: response.data.data, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Xóa sản phẩm thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearCart: async () => {
    set({ isLoading: true, error: null });
    try {
      await cartAPI.clearCart();
      set({ cart: { items: [] }, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Xóa giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  getTotal: () => {
    const { cart } = get();
    if (!cart || !Array.isArray(cart.items)) return 0;
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  getItemCount: () => {
    const { cart } = get();
    if (!cart || !Array.isArray(cart.items)) return 0;
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  },

  getItemByVariant: (variantId) => {
    const { cart } = get();
    return cart?.items?.find(item => item.variantId === variantId);
  },

  clearError: () => set({ error: null }),
}));