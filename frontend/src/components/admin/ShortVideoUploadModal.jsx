import React, { useState, useRef } from "react";
import { X, Upload, Video, Loader2, CheckCircle } from "lucide-react";
import { shortVideoAPI } from "@/lib/api";
import { toast } from "sonner";

const ShortVideoUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Vui lòng chọn file video hợp lệ");
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Video không được vượt quá 100MB");
      return;
    }

    setVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Ảnh thumbnail không được vượt quá 5MB");
      return;
    }

    setThumbnailFile(file);
    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreview(previewUrl);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề video");
      return;
    }

    if (!videoFile) {
      toast.error("Vui lòng chọn file video");
      return;
    }

    if (!thumbnailFile) {
      toast.error("Vui lòng chọn ảnh thumbnail");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("status", "PUBLISHED"); // ✅ Luôn publish ngay
      data.append("video", videoFile);
      data.append("thumbnail", thumbnailFile);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await shortVideoAPI.create(data);

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success("Upload video thành công!");

      setTimeout(() => {
        onSuccess?.(response.data?.data);
        handleClose();
      }, 500);
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast.error(error.response?.data?.message || "Upload video thất bại");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);

    setFormData({ title: "", description: "" });
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoPreview(null);
    setThumbnailPreview(null);
    setIsUploading(false);
    setUploadProgress(0);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br bg-black flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Upload Video Mới</h2>
              <p className="text-sm text-gray-500">
                Video sẽ được xuất bản ngay sau khi upload
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Video Upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Video <span className="text-red-500">*</span>
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => !isUploading && videoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  videoFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-pink-500 hover:bg-pink-50"
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                {videoFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                    <p className="font-semibold text-green-800">
                      Video đã chọn
                    </p>
                    <p className="text-sm text-gray-600 truncate max-w-full">
                      {videoFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <p className="font-semibold">Chọn video</p>
                    <p className="text-sm text-gray-500">
                      MP4, MOV, AVI • Tối đa 100MB
                    </p>
                  </div>
                )}
              </div>

              {videoPreview && (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-black">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full h-full object-contain"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Ảnh Thumbnail <span className="text-red-500">*</span>
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() =>
                  !isUploading && thumbnailInputRef.current?.click()
                }
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  thumbnailFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-pink-500 hover:bg-pink-50"
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                {thumbnailFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                    <p className="font-semibold text-green-800">Ảnh đã chọn</p>
                    <p className="text-sm text-gray-600 truncate max-w-full">
                      {thumbnailFile.name}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <p className="font-semibold">Chọn ảnh</p>
                    <p className="text-sm text-gray-500">
                      JPG, PNG • Tối đa 5MB
                    </p>
                  </div>
                )}
              </div>

              {thumbnailPreview && (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="VD: iPhone 17 Pro Max - Đánh giá chi tiết"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={isUploading}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/100 ký tự
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Mô tả (tùy chọn)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Mô tả ngắn về nội dung video..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              disabled={isUploading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 ký tự
            </p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-800">
                  Đang upload...
                </span>
                <span className="text-sm font-bold text-blue-800">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isUploading ||
                !videoFile ||
                !thumbnailFile ||
                !formData.title.trim()
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r bg-black text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang upload...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload & Xuất bản
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortVideoUploadModal;
