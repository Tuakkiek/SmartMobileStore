// ============================================
// FILE: frontend/src/store/homeLayoutStore.js
// State management for homepage layout editor
// ============================================

import { create } from "zustand";
import { homePageAPI } from "@/lib/api";
import { toast } from "sonner";

export const useHomeLayoutStore = create((set, get) => ({
  // State
  layout: null,
  sections: [],
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,

  // ============================================
  // FETCH LAYOUT
  // ============================================
  fetchLayout: async () => {
    set({ isLoading: true });
    try {
      const response = await homePageAPI.getLayout();
      const layout = response.data?.data?.layout;

      if (layout) {
        set({
          layout,
          sections: layout.sections || [],
          isLoading: false,
          hasUnsavedChanges: false,
        });
      }
    } catch (error) {
      console.error("fetchLayout error:", error);
      toast.error("Không thể tải cấu hình trang chủ");
      set({ isLoading: false });
    }
  },

  // ============================================
  // UPDATE SECTION
  // ============================================
  updateSection: (sectionId, updates) => {
    const { sections } = get();
    const newSections = sections.map((s) =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    set({ sections: newSections, hasUnsavedChanges: true });
  },

  // ============================================
  // TOGGLE SECTION
  // ============================================
  toggleSection: async (sectionId) => {
    const { sections } = get();
    const section = sections.find((s) => s.id === sectionId);

    if (!section) return;

    const newEnabled = !section.enabled;

    // Optimistic update
    get().updateSection(sectionId, { enabled: newEnabled });

    try {
      await homePageAPI.toggleSection(sectionId, newEnabled);
      toast.success(`Đã ${newEnabled ? "bật" : "tắt"} section`);
      set({ hasUnsavedChanges: false });
    } catch (error) {
      // Revert on error
      get().updateSection(sectionId, { enabled: section.enabled });
      toast.error("Không thể cập nhật section");
    }
  },

  // ============================================
  // REORDER SECTIONS
  // ============================================
  reorderSections: (newSections) => {
    set({ sections: newSections, hasUnsavedChanges: true });
  },

  // ============================================
  // UPDATE SECTION CONFIG
  // ============================================
  updateSectionConfig: (sectionId, config, title) => {
    const { sections } = get();
    const newSections = sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            config: { ...s.config, ...config },
            ...(title !== undefined && { title }),
          }
        : s
    );
    set({ sections: newSections, hasUnsavedChanges: true });
  },

  // ============================================
  // SAVE LAYOUT
  // ============================================
  saveLayout: async () => {
    const { sections } = get();
    set({ isSaving: true });

    try {
      const response = await homePageAPI.updateLayout(sections);
      const layout = response.data?.data?.layout;

      set({
        layout,
        sections: layout.sections,
        isSaving: false,
        hasUnsavedChanges: false,
      });

      toast.success("Đã lưu cấu hình trang chủ");
      return true;
    } catch (error) {
      console.error("saveLayout error:", error);
      toast.error("Không thể lưu cấu hình");
      set({ isSaving: false });
      return false;
    }
  },

  // ============================================
  // UPLOAD BANNER
  // ============================================
  uploadBanner: async (file) => {
    try {
      const response = await homePageAPI.uploadBanner(file);
      const imagePath = response.data?.data?.imagePath;

      if (imagePath) {
        toast.success("Tải ảnh lên thành công");
        return imagePath;
      }
      return null;
    } catch (error) {
      console.error("uploadBanner error:", error);
      toast.error("Không thể tải ảnh lên");
      return null;
    }
  },

  // ============================================
  // DELETE BANNER
  // ============================================
  deleteBanner: async (imagePath) => {
    try {
      await homePageAPI.deleteBanner(imagePath);
      toast.success("Đã xóa ảnh");
      return true;
    } catch (error) {
      console.error("deleteBanner error:", error);
      toast.error("Không thể xóa ảnh");
      return false;
    }
  },

  // ============================================
  // RESET TO DEFAULT
  // ============================================
  resetToDefault: async () => {
    try {
      const response = await homePageAPI.resetToDefault();
      const layout = response.data?.data?.layout;

      set({
        layout,
        sections: layout.sections,
        hasUnsavedChanges: false,
      });

      toast.success("Đã reset về giao diện mặc định");
      return true;
    } catch (error) {
      console.error("resetToDefault error:", error);
      toast.error("Không thể reset giao diện");
      return false;
    }
  },

  // ============================================
  // RESET STATE
  // ============================================
  resetState: () => {
    set({
      layout: null,
      sections: [],
      isLoading: false,
      isSaving: false,
      hasUnsavedChanges: false,
    });
  },
}));

export default useHomeLayoutStore;
