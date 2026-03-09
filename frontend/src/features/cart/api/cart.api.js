import { api } from "@/shared/lib/http/httpClient";

export const cartAPI = {
  getCartCount: (config = {}) => api.get("/cart/count", config),
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart", data),
  updateItem: (data) => api.put("/cart", data),
  removeItem: (itemId) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete("/cart"),
};
