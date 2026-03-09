import { api } from "@/shared/lib/http/httpClient";

export const storeAPI = {
  getAll: (params = {}) => api.get("/stores", { params }),
  getById: (storeId) => api.get(`/stores/${storeId}`),
  getNearby: (params = {}) => api.get("/stores/nearby", { params }),
  checkStock: (storeId, items = []) =>
    api.post(`/stores/${storeId}/check-stock`, { items }),
  create: (data) => api.post("/stores", data),
  update: (id, data) => api.put(`/stores/${id}`, data),
  delete: (id) => api.delete(`/stores/${id}`),
};
