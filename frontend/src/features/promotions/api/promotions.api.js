import { api } from "@/shared/lib/http/httpClient";

export const promotionAPI = {
  getAll: (params = {}) => api.get("/promotions", { params }),
  getAllPromotions: (params = {}) => api.get("/promotions/admin", { params }),
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
  getActive: () => api.get("/promotions/active"),
  apply: (data) => api.post("/promotions/apply", data),
};
