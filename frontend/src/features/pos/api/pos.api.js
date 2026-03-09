import { api } from "@/shared/lib/http/httpClient";

export const posAPI = {
  createOrder: (data) => api.post("/pos/create-order", data),
  getPendingOrders: (params = {}) => api.get("/pos/pending-orders", { params }),
  processPayment: (orderId, data) =>
    api.post(`/pos/orders/${orderId}/payment`, data),
  cancelOrder: (orderId, data = {}) =>
    api.post(`/pos/orders/${orderId}/cancel`, data),
  issueVAT: (orderId, data) => api.post(`/pos/orders/${orderId}/vat`, data),
  getHistory: (params = {}) => api.get("/pos/history/", { params }),
  getOrderById: (orderId) => api.get(`/pos/orders/${orderId}`),
  finalizeOrder: (orderId, data) => api.put(`/pos/orders/${orderId}/finalize`, data),
};
