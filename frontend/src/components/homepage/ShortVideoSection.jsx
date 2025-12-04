import React, { useState, useEffect } from "react";
import { Play, TrendingUp, Heart } from "lucide-react";

// Mock API - Replace with real API
const fetchVideos = async () => {
  return [
    {
      _id: "1",
      title: "iPhone 17 Pro Max Unboxing",
      thumbnailUrl: "/ip17pm.png",
      views: 15420,
      likes: 892,
      duration: 45,
    },
    {
      _id: "2",
      title: "MacBook Pro M4 Review",
      thumbnailUrl: "/macpro14.png",
      views: 8930,
      likes: 634,
      duration: 60,
    },
    {
      _id: "3",
      title: "AirPods Pro Tips & Tricks",
      thumbnailUrl: "/banner_phu1.png",
      views: 12100,
      likes: 743,
      duration: 38,
    },
    {
      _id: "4",
      title: "iPad Air 2025 First Look",
      thumbnailUrl: "/ipAir.png",
      views: 6780,
      likes: 421,
      duration: 52,
    },
  ];
};

const ShortVideoSection = ({ onVideoClick }) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await fetchVideos();
      setVideos(data);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
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
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-[9/16] bg-gray-200 rounded-2xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

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
                Video ngắn
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
              onClick={() => onVideoClick(index)}
              className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-2xl"
            >
              {/* Thumbnail */}
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
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
                    <Play className="w-3 h-3" />
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
          <button className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all">
            Xem tất cả video
          </button>
        </div>
      </div>
    </section>
  );
};

export default ShortVideoSection;
