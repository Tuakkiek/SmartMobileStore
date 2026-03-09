import { api } from "@/shared/lib/http/httpClient";

export const homePageAPI = {
  getLayout: () => api.get("/homepage/layout"),
  updateLayout: (sections) => api.put("/homepage/layout", { sections }),
  toggleSection: (sectionId, enabled) =>
    api.patch(`/homepage/sections/${sectionId}/toggle`, { enabled }),
  reorderSections: (sectionIds) =>
    api.put("/homepage/sections/reorder", { sectionIds }),
  updateSectionConfig: (sectionId, config, title) =>
    api.patch(`/homepage/sections/${sectionId}/config`, { config, title }),
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/homepage/upload-banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteBanner: (imagePath) =>
    api.delete("/homepage/banner", { data: { imagePath } }),
  resetToDefault: () => api.post("/homepage/reset-default"),
};
