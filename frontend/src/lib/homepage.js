// ============================================
// FILE: frontend/src/lib/api/homepage.js
// API calls for homepage layout management
// ============================================

import api from "./axios";

export const homePageAPI = {
  // Get active layout (public)
  getLayout: () => api.get("/homepage/layout"),

  // Update entire layout (admin)
  updateLayout: (sections) => api.put("/homepage/layout", { sections }),

  // Toggle section on/off
  toggleSection: (sectionId, enabled) =>
    api.patch(`/homepage/sections/${sectionId}/toggle`, { enabled }),

  // Reorder sections
  reorderSections: (sectionIds) =>
    api.put("/homepage/sections/reorder", { sectionIds }),

  // Update section config
  updateSectionConfig: (sectionId, config, title) =>
    api.patch(`/homepage/sections/${sectionId}/config`, { config, title }),

  // Upload banner image
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/homepage/upload-banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Delete banner image
  deleteBanner: (imagePath) =>
    api.delete("/homepage/banner", { data: { imagePath } }),

  // Reset to default layout
  resetToDefault: () => api.post("/homepage/reset-default"),
};

export default homePageAPI;