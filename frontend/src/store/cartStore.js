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

  // FIXED: addToCart - BẮT BUỘC variantId + productType + LOGGING + VALID TYPES
  addToCart: async (variantId, quantity = 1, productType) => {
    // ENHANCED VALIDATION
    console.log("cartStore.addToCart called with:", {
      variantId,
      quantity,
      productType,
      types: {
        variantId: typeof variantId,
        quantity: typeof quantity,
        productType: typeof productType,
      },
    });

    if (!variantId) {
      const message = "Thiếu variantId";
      console.error("variantId is missing:", variantId);
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    if (!productType) {
      const message = "Thiếu productType";
      console.error("productType is missing:", productType);
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    // VALIDATE productType (note: backend might use different names)
    const validTypes = [
      "iPhone",
      "iPad",
      "Mac",
      "AirPods",
      "AppleWatch",
      "Accessories",
    ];
    if (!validTypes.includes(productType)) {
      const message = `productType không hợp lệ: ${productType}`;
      console.error(
        "Invalid productType:",
        productType,
        "Valid types:",
        validTypes
      );
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    set({ isLoading: true, error: null });
    try {
      console.log("Sending to API:", {
        variantId,
        quantity,
        productType,
      });

      const response = await cartAPI.addToCart({
        variantId,
        quantity,
        productType,
      });

      console.log("Cart API response:", response.data);
      set({ cart: response.data.data, isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("Cart API error:", error.response?.data || error);
      const message =
        error.response?.data?.message || "Thêm vào giỏ hàng thất bại";
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
      const message =
        error.response?.data?.message || "Cập nhật giỏ hàng thất bại";
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
    return cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  },

  getItemCount: () => {
    const { cart } = get();
    if (!cart || !Array.isArray(cart.items)) return 0;
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  },

  getItemByVariant: (variantId) => {
    const { cart } = get();
    return cart?.items?.find((item) => item.variantId === variantId);
  },

  clearError: () => set({ error: null }),
}));
