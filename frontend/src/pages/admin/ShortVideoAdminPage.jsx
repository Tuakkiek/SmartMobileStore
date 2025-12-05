import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Video,
  Eye,
  Heart,
  Share2,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { shortVideoAPI } from "@/lib/api";
import { toast } from "sonner";
import ShortVideoUploadModal from "@/components/admin/ShortVideoUploadModal";

const ShortVideoAdminPage = () => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || video.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleReorder = async (id, direction) => {
    const index = videos.findIndex((v) => v._id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === videos.length - 1)
    ) {
      return;
    }

    const newVideos = [...videos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newVideos[index], newVideos[targetIndex]] = [
      newVideos[targetIndex],
      newVideos[index],
    ];

    newVideos.forEach((video, idx) => {
      video.order = idx + 1;
    });

    setVideos(newVideos);

    try {
      const videoIds = newVideos.map((v) => v._id);
      await shortVideoAPI.reorder(videoIds);
      toast.success("Đã cập nhật thứ tự");
    } catch (error) {
      toast.error("Không thể cập nhật thứ tự");
      loadVideos();
    }
  };

  const handleUploadSuccess = (newVideo) => {
    loadVideos();
    toast.success("Video đã được thêm thành công!");
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      PUBLISHED: "bg-green-100 text-green-800",
      DRAFT: "bg-yellow-100 text-yellow-800",
      ARCHIVED: "bg-gray-100 text-gray-800",
    };
    const labels = {
      PUBLISHED: "Đã xuất bản",
      DRAFT: "Bản nháp",
      ARCHIVED: "Đã lưu trữ",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
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
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quản lý Video ngắn
                </h1>
                <p className="text-sm text-gray-500">{videos.length} video</p>
              </div>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Thêm video mới
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </select>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video, index) => (
            <div
              key={video._id}
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] bg-gray-900 group">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

                {/* Duration */}
                <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded-full text-xs text-white font-semibold">
                  {Math.floor(video.duration / 60)}:
                  {String(video.duration % 60).padStart(2, "0")}
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(video.status)}
                </div>

                {/* Stats Overlay */}
                <div className="absolute bottom-3 left-3 right-3 space-y-2">
                  <div className="flex items-center gap-4 text-white text-sm">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatNumber(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {formatNumber(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-4 h-4" />
                      {formatNumber(video.shares)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 line-clamp-1">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {video.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Thứ tự: #{video.order}</span>
                  {video.publishedAt && (
                    <span>
                      {new Date(video.publishedAt).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReorder(video._id, "up")}
                    disabled={index === 0}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReorder(video._id, "down")}
                    disabled={index === filteredVideos.length - 1}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <div className="flex-1"></div>
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(video._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
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
              Không tìm thấy video
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác"
                : "Bắt đầu bằng cách thêm video mới"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Thêm video đầu tiên
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
    </div>
  );
};

export default ShortVideoAdminPage;
