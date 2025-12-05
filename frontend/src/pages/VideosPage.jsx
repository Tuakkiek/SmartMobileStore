import React, { useState, useEffect } from "react";
import { Play, TrendingUp, Heart, Eye, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { shortVideoAPI } from "@/lib/api";
import { toast } from "sonner";
import ShortVideoPlayerModal from "@/components/homepage/ShortVideoPlayerModal";

// ✅ HELPER: Convert relative path to absolute URL
const getMediaUrl = (path) => {
  if (!path) return "/placeholder.png";
  if (path.startsWith("http")) return path;

  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:5000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
};

const VideosPage = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("latest");

  // Video player modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoInitialIndex, setVideoInitialIndex] = useState(0);

  useEffect(() => {
    loadVideos();
  }, [activeTab]);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const response =
        activeTab === "trending"
          ? await shortVideoAPI.getTrending(50)
          : await shortVideoAPI.getPublished({ limit: 50 });

      const videoData = response.data?.data?.videos || [];
      setVideos(videoData);
    } catch (error) {
      console.error("❌ Error loading videos:", error);
      toast.error("Không thể tải video");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoClick = (index) => {
    setVideoInitialIndex(index);
    setVideoModalOpen(true);
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views?.toString() || "0";
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-black to-cyan-300 text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Play className="w-8 h-8 fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Video ngắn</h1>
             </div>
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <Play className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Chưa có video
            </h3>
            <p className="text-gray-500">Quay lại sau để xem video mới nhất</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">
                  {videos.length}
                </span>{" "}
                video
              </p>
            </div>

            {/* Videos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {videos.map((video, index) => (
                <button
                  key={video._id}
                  onClick={() => handleVideoClick(index)}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-2xl"
                >
                  {/* Thumbnail */}
                  <img
                    src={getMediaUrl(video.thumbnailUrl)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                  {/* Play Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white font-semibold">
                    {formatDuration(video.duration)}
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViews(video.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatViews(video.likes)}
                      </span>
                    </div>
                  </div>

                  {/* Hover Border Glow */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-pink-500/50 transition-colors"></div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Video Player Modal */}
      <ShortVideoPlayerModal
        open={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        initialIndex={videoInitialIndex}
        videos={videos}
      />
    </div>
  );
};

export default VideosPage;
