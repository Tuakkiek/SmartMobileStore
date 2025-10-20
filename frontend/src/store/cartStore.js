// FILE: src/store/cartStore.js
// ✅ VARIANTS SUPPORT: addToCart(variantId, quantity)
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

  // ✅ UPDATED: addToCart nhận variantId thay vì productId
  addToCart: async (variantId, quantity = 1) => {
    set({ isLoading: true, error: null });
    try {
      // ✅ GỬI { variantId, quantity }
      const response = await cartAPI.addToCart({ variantId, quantity });
      set({ cart: response.data.data, isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || "Thêm vào giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // ✅ UPDATED: updateCartItem nhận variantId
  updateCartItem: async (variantId, quantity) => {
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

  // ✅ UPDATED: removeFromCart nhận variantId
  removeFromCart: async (variantId) => {
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

  // Clear cart
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

  // ✅ UPDATED: getTotal - DÙNG variant.price
  getTotal: () => {
    const { cart } = get();
    if (!cart || !cart.items) return 0;
    
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  },

  // Get item count
  getItemCount: () => {
    const { cart } = get();
    if (!cart || !cart.items) return 0;
    
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  },

  // Get item by variantId
  getItemByVariant: (variantId) => {
    const { cart } = get();
    return cart.items.find(item => item.variantId === variantId);
  },

  // Clear error
  clearError: () => set({ error: null }),
}));