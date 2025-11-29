// ============================================
// FILE: frontend/src/pages/admin/HomePageEditor.jsx
// Main page for editing homepage layout
// ============================================

import React, { useEffect, useState } from "react";
import { useHomeLayoutStore } from "@/store/homeLayoutStore";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/Loading";
import {
  Save,
  Eye,
  RotateCcw,
  AlertCircle,
  Monitor,
  Smartphone,
} from "lucide-react";
import SectionList from "@/components/admin/homepage/SectionList";
import HomePagePreview from "@/components/admin/homepage/HomePagePreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const HomePageEditor = () => {
  const {
    sections,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    fetchLayout,
    saveLayout,
    resetToDefault,
  } = useHomeLayoutStore();

  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop"); // 'desktop' | 'mobile'
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  // Warning before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    const success = await saveLayout();
    if (success) {
      toast.success("Đã lưu thay đổi", {
        description: "Giao diện trang chủ đã được cập nhật",
      });
    }
  };

  const handleReset = async () => {
    const success = await resetToDefault();
    if (success) {
      setShowResetDialog(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Chỉnh sửa giao diện trang chủ
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Quản lý bố cục và nội dung trang chủ
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Có thay đổi chưa lưu
                </div>
              )}

              {/* Preview Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Ẩn xem trước" : "Xem trước"}
              </Button>

              {/* Reset Button */}
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(true)}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <RotateCcw className="w-4 h-4" />
                Reset mặc định
              </Button>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: Section List */}
          <div className={showPreview ? "col-span-4" : "col-span-12"}>
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Danh sách sections
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {sections.length} sections • {sections.filter((s) => s.enabled).length} đang hiển thị
                </p>
              </div>

              <div className="p-6">
                <SectionList sections={sections} />
              </div>
            </div>
          </div>

          {/* Right Panel: Preview */}
          {showPreview && (
            <div className="col-span-8">
              <div className="bg-white rounded-lg shadow-sm border sticky top-24">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Xem trước
                  </h2>

                  {/* Preview Mode Toggle */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewMode("desktop")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        previewMode === "desktop"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Monitor className="w-4 h-4 inline mr-1" />
                      Desktop
                    </button>
                    <button
                      onClick={() => setPreviewMode("mobile")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        previewMode === "mobile"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 inline mr-1" />
                      Mobile
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 max-h-[calc(100vh-200px)] overflow-auto">
                  <HomePagePreview
                    sections={sections}
                    mode={previewMode}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset về giao diện mặc định?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa toàn bộ cấu hình hiện tại và khôi phục về
              giao diện mặc định. <br />
              <span className="text-red-600 font-medium">
                Không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HomePageEditor;