// FILE: src/store/cartStore.js
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

  // Add to cart
  addToCart: async (productId, quantity = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.addToCart({ productId, quantity });
      set({ cart: response.data.data, isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || "Thêm vào giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Update cart item
  updateCartItem: async (productId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.updateItem({ productId, quantity });
      set({ cart: response.data.data, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Cập nhật giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Remove from cart
  removeFromCart: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartAPI.removeItem(productId);
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

  // Calculate total
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

  // Clear error
  clearError: () => set({ error: null }),
}));