import { api } from "@/shared/lib/http/httpClient";

export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params = {}) => api.get("/orders/my-orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getByStage: (statusStage, params = {}) =>
    api.get("/orders/all", { params: { ...params, statusStage } }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  assignCarrier: (id, data) => api.patch(`/orders/${id}/assign-carrier`, data),
  cancel: (id, data = {}) => api.post(`/orders/${id}/cancel`, data),
  assignStore: (id, data) => api.patch(`/orders/${id}/assign-store`, data),
};

export const notificationAPI = {
  getMyNotifications: (params) => api.get("/notifications/my-notifications", { params }),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put("/notifications/mark-all-read"),
};
