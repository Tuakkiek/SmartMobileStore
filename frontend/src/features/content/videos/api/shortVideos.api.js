import { api } from "@/shared/lib/http/httpClient";

export const shortVideoAPI = {
  getPublished: (params) => api.get("/short-videos/published", { params }),
  getTrending: (limit = 20) =>
    api.get("/short-videos/trending", { params: { limit } }),
  getById: (id) => api.get(`/short-videos/${id}`),
  incrementView: (id) => api.post(`/short-videos/${id}/view`),
  toggleLike: (id) => api.post(`/short-videos/${id}/like`),
  incrementShare: (id) => api.post(`/short-videos/${id}/share`),
  getAll: (params) => api.get("/short-videos", { params }),
  create: (data) =>
    api.post("/short-videos", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, data) => api.put(`/short-videos/${id}`, data),
  delete: (id) => api.delete(`/short-videos/${id}`),
  reorder: (videoIds) => api.put("/short-videos/reorder", { videoIds }),
};
