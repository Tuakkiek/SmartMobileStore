import { api } from "@/shared/lib/http/httpClient";

export const searchAPI = {
  search: (params) => api.get("/search", { params }),
  autocomplete: (params) => api.get("/search/autocomplete", { params }),
};
