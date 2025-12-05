import React, { useState, useEffect } from "react";
import { Play, TrendingUp, Heart, Eye, Loader2 } from "lucide-react";
import { shortVideoAPI } from "@/lib/api";
import { toast } from "sonner";

const ShortVideoSection = ({
  title = "Video ngắn",
  videoLimit = 6,
  videoType = "latest",
  onVideoClick,
}) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, [videoType, videoLimit]);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      console.log("🎬 Loading videos...", { videoType, videoLimit });

      const response =
        videoType === "trending"
          ? await shortVideoAPI.getTrending(videoLimit)
          : await shortVideoAPI.getPublished({ limit: videoLimit });

      console.log("✅ Videos loaded:", response.data);

      const videoData = response.data?.data?.videos || [];
      console.log("📹 Video data:", videoData);

      setVideos(videoData);
    } catch (error) {
      console.error("❌ Error loading videos:", error);
      toast.error("Không thể tải video");
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <section className="py-8 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        </div>
      </section>
    );
  }

  if (!videos.length) {
    console.log("⚠️ No videos to display");
    return null;
  }

  console.log("🎥 Rendering", videos.length, "videos");

  return (
    <section className="py-8 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {title}
              </h2>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Khám phá sản phẩm qua video
              </p>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {videos.map((video, index) => (
            <button
              key={video._id}
              onClick={() => onVideoClick(index, videos)}
              className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-2xl"
            >
              {/* Thumbnail */}
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("❌ Image load error:", video.thumbnailUrl);
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

        {/* View All Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => (window.location.href = "/videos")}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all"
          >
            Xem tất cả video
          </button>
        </div>
      </div>
    </section>
  );
};

export default ShortVideoSection;
