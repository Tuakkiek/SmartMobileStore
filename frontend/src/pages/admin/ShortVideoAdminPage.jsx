import React, { useState, useEffect } from "react";
import { Plus, Search, Video, Trash2, Loader2, Play } from "lucide-react";
import { shortVideoAPI } from "@/lib/api";
import { toast } from "sonner";
import ShortVideoUploadModal from "@/components/admin/ShortVideoUploadModal";

// ✅ HELPER: Convert path to URL
const getMediaUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:5000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

const ShortVideoAdminPage = () => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const response = await shortVideoAPI.getAll();
      const videoData = response.data?.data?.videos || [];
      setVideos(videoData);
    } catch (error) {
      console.error("Load videos error:", error);
      toast.error("Không thể tải danh sách video");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa video này?")) return;

    try {
      await shortVideoAPI.delete(id);
      setVideos(videos.filter((v) => v._id !== id));
      toast.success("Đã xóa video");
    } catch (error) {
      toast.error("Không thể xóa video");
    }
  };

  const handleUploadSuccess = () => {
    loadVideos();
    toast.success("Video đã được thêm thành công!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br bg-black flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quản lý Video
                </h1>
                <p className="text-sm text-gray-500">{videos.length} video</p>
              </div>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r bg-black text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Upload video
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm video..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video._id}
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail with Play Button */}
              <div
                className="relative aspect-[9/16] bg-gray-900 group cursor-pointer"
                onClick={() => setPreviewVideo(video)}
              >
                <img
                  src={getMediaUrl(video.thumbnailUrl)}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>

                {/* Title */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-semibold text-sm line-clamp-2">
                    {video.title}
                  </h3>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {new Date(video.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                  <button
                    onClick={() => handleDelete(video._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredVideos.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? "Không tìm thấy video" : "Chưa có video"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác"
                : "Bắt đầu bằng cách upload video mới"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-gradient-to-r bg-black text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Upload video đầu tiên
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <ShortVideoUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div className="relative w-full max-w-[500px] aspect-[9/16]">
            <video
              src={getMediaUrl(previewVideo.videoUrl)}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortVideoAdminPage;
