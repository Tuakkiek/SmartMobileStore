// ============================================
// FILE: src/store/cartStore.js
// FIXED: Dùng Array thay Set cho selectedForCheckout → Checkout hoạt động
// ============================================

import { create } from "zustand";
import { cartAPI } from "@/lib/api";

export const useCartStore = create((set, get) => ({
  cart: { items: [] },
  isLoading: false,
  error: null,

  // === DÙNG ARRAY THAY VÌ SET ===
  selectedForCheckout: [], // ← Mảng các variantId được chọn

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
  addToCart: async (variantId, quantity = 1, productType) => {
    console.log("cartStore.addToCart called:", {
      variantId,
      quantity,
      productType,
      typeOf: {
        variantId: typeof variantId,
        productType: typeof productType,
      },
    });

    if (!variantId) {
      console.error("variantId is missing or invalid:", variantId);
      const message = "Thiếu variantId";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    if (!productType) {
      console.error("productType is missing:", productType);
      const message = "Thiếu productType";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    const validTypes = ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"];
    if (!validTypes.includes(productType)) {
      console.error("Invalid productType:", productType, "Valid:", validTypes);
      const message = `productType không hợp lệ: ${productType}`;
      set({ error: message, isLoading: false });
      return { success: false, message };
    }

    set({ isLoading: true, error: null });

    try {
      console.log("Sending to cartAPI.addToCart:", { variantId, quantity, productType });
      const response = await cartAPI.addToCart({ variantId, quantity, productType });
      console.log("cartAPI response:", response);

      set({ cart: response.data.data, isLoading: false });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("cartAPI error:", error.response?.data || error);
      const message = error.response?.data?.message || "Thêm vào giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // ============================================
  // UPDATE CART ITEM - FIXED
  // ============================================
  updateCartItem: async (itemId, quantity) => {
    if (!itemId || quantity < 0) {
      console.error("Invalid update params:", { itemId, quantity });
      return { success: false, message: "Thông tin không hợp lệ" };
    }

    set({ isLoading: true, error: null });
    try {
      const { cart } = get();

      const item = cart.items.find((i) => {
        const itemIdStr = i._id?.toString();
        const variantIdStr = i.variantId?.toString();
        const searchIdStr = itemId.toString();

        return itemIdStr === searchIdStr || variantIdStr === searchIdStr;
      });

      if (!item) {
        console.error("Item not found in cart:", itemId);
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      console.log("Updating cart item:", {
        itemId: item._id,
        variantId: item.variantId,
        productType: item.productType,
        quantity,
      });

      const response = await cartAPI.updateItem({
        variantId: item.variantId,
        productType: item.productType,
        quantity,
      });

      set({ cart: response.data.data, isLoading: false });
      return { success: true };
    } catch (error) {
      console.error("updateCartItem error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Cập nhật giỏ hàng thất bại";
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // ============================================
  // REMOVE FROM CART - FIXED
  // ============================================
  removeFromCart: async (itemId) => {
    if (!itemId) {
      console.error("No itemId provided");
      return { success: false, message: "Thiếu thông tin sản phẩm" };
    }

    set({ isLoading: true, error: null });
    try {
      const { cart } = get();

      const item = cart.items.find((i) => {
        const itemIdStr = i._id?.toString();
        const variantIdStr = i.variantId?.toString();
        const searchIdStr = itemId.toString();

        return itemIdStr === searchIdStr || variantIdStr === searchIdStr;
      });

      if (!item) {
        console.error("Item not found in cart:", itemId);
        throw new Error("Không tìm thấy sản phẩm trong giỏ hàng");
      }

      const deleteId = item._id || item.variantId;

      console.log("Removing cart item:", {
        searchId: itemId,
        foundItemId: item._id,
        foundVariantId: item.variantId,
        deleteId: deleteId,
      });

      const response = await cartAPI.removeItem(deleteId);
      set({ cart: response.data.data, isLoading: false });
      return { success: true };
    } catch (error) {
      console.error("removeFromCart error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Xóa sản phẩm thất bại";
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
      (total, item) => total + (item.price || 0) * (item.quantity || 0),
      0
    );
  },

  getItemCount: () => {
    const { cart } = get();
    if (!cart || !Array.isArray(cart.items)) return 0;
    return cart.items.reduce((count, item) => count + (item.quantity || 0), 0);
  },

  getItemByVariant: (variantId) => {
    const { cart } = get();
    if (!cart || !Array.isArray(cart.items)) return null;

    return cart.items.find((item) => {
      const itemVariantId = item.variantId?.toString();
      const searchId = variantId?.toString();
      return itemVariantId === searchId;
    });
  },

  // === SET DANH SÁCH ĐÃ CHỌN – DÙNG ARRAY ===
  setSelectedForCheckout: (variantIds = []) => {
    // Đảm bảo luôn là mảng
    const ids = Array.isArray(variantIds) ? variantIds : [];
    set({ selectedForCheckout: ids });
  },

  // === LẤY TỔNG TIỀN CHỈ CÁC SẢN PHẨM ĐƯỢC CHỌN ===
  getSelectedTotal: () => {
    const { cart, selectedForCheckout } = get();
    if (!cart?.items || selectedForCheckout.length === 0) return 0;

    return cart.items
      .filter((item) => selectedForCheckout.includes(item.variantId))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // === LẤY DANH SÁCH SẢN PHẨM ĐƯỢC CHỌN ===
  getSelectedItems: () => {
    const { cart, selectedForCheckout } = get();
    if (!cart?.items || selectedForCheckout.length === 0) return [];

    return cart.items.filter((item) =>
      selectedForCheckout.includes(item.variantId)
    );
  },

  clearError: () => set({ error: null }),
}));