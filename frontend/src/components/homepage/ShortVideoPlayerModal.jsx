import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Heart,
  Share2,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
} from "lucide-react";

// Mock videos - Replace with real data
const mockVideos = [
  {
    _id: "1",
    title: "iPhone 17 Pro Max - Đánh giá chi tiết",
    description:
      "Cùng khám phá iPhone 17 Pro Max với thiết kế hoàn toàn mới và chip A19 Pro siêu mạnh mẽ!",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    views: 15420,
    likes: 892,
    isLiked: false,
    linkedProducts: [
      {
        _id: "1",
        name: "iPhone 17 Pro Max 256GB",
        image: "/ip17pm.png",
        price: 34990000,
      },
    ],
  },
  {
    _id: "2",
    title: "MacBook Pro M4 - Sức mạnh vượt trội",
    description:
      "MacBook Pro M4 với hiệu năng đột phá, màn hình ProMotion 120Hz tuyệt đẹp",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    views: 8930,
    likes: 634,
    isLiked: false,
    linkedProducts: [
      {
        _id: "2",
        name: 'MacBook Pro 14" M4',
        image: "/macpro14.png",
        price: 45990000,
      },
    ],
  },
  {
    _id: "3",
    title: "AirPods Pro - Mẹo hay không phải ai cũng biết",
    description: "10 tính năng ẩn của AirPods Pro giúp bạn trải nghiệm tốt hơn",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    views: 12100,
    likes: 743,
    isLiked: true,
    linkedProducts: [],
  },
];

const ShortVideoPlayerModal = ({ open, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const videoRef = useRef(null);

  const currentVideo = mockVideos[currentIndex];

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current
        .play()
        .catch((err) => console.log("Autoplay prevented:", err));
    }
  }, [open, currentIndex]);

  const handleNext = () => {
    if (currentIndex < mockVideos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLike = () => {
    // TODO: Call API to toggle like
    console.log("Toggle like for video:", currentVideo._id);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: currentVideo.title,
        text: currentVideo.description,
        url: window.location.href,
      });
    } catch (err) {
      console.log("Share failed:", err);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video Player */}
        <div className="relative w-full max-w-[500px] h-full bg-black">
          <video
            ref={videoRef}
            src={currentVideo.videoUrl}
            className="w-full h-full object-contain"
            loop
            muted={isMuted}
            playsInline
            onClick={() => {
              if (videoRef.current.paused) {
                videoRef.current.play();
              } else {
                videoRef.current.pause();
              }
            }}
          />

          {/* Bottom Gradient Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

          {/* Video Info (Bottom Left) */}
          <div className="absolute bottom-0 left-0 right-16 p-4 text-white space-y-2">
            <h3 className="font-bold text-lg line-clamp-2">
              {currentVideo.title}
            </h3>
            <p className="text-sm text-gray-300 line-clamp-2">
              {currentVideo.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <span>{formatNumber(currentVideo.views)} lượt xem</span>
              <span>•</span>
              <span>{formatNumber(currentVideo.likes)} lượt thích</span>
            </div>
          </div>

          {/* Action Buttons (Right Side) */}
          <div className="absolute right-4 bottom-4 flex flex-col gap-4">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                  currentVideo.isLiked
                    ? "bg-pink-500"
                    : "bg-black/50 hover:bg-black/70"
                }`}
              >
                <Heart
                  className={`w-6 h-6 ${
                    currentVideo.isLiked ? "fill-white" : ""
                  }`}
                />
              </div>
              <span className="text-xs font-semibold">
                {formatNumber(currentVideo.likes)}
              </span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 flex items-center justify-center transition-colors">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold">Chia sẻ</span>
            </button>

            {/* Products Button */}
            {currentVideo.linkedProducts.length > 0 && (
              <button
                onClick={() => setShowProducts(!showProducts)}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div
                  className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                    showProducts
                      ? "bg-blue-500"
                      : "bg-black/50 hover:bg-black/70"
                  }`}
                >
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold">Sản phẩm</span>
              </button>
            )}

            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 flex items-center justify-center transition-colors">
                {isMuted ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </div>
            </button>
          </div>

          {/* Navigation Buttons (Desktop) */}
          <div className="hidden md:flex absolute inset-y-0 left-0 right-0 items-center justify-between px-4 pointer-events-none">
            {currentIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 flex items-center justify-center text-white transition-colors pointer-events-auto"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
            )}
            <div></div>
            {currentIndex < mockVideos.length - 1 && (
              <button
                onClick={handleNext}
                className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 flex items-center justify-center text-white transition-colors pointer-events-auto"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Products Drawer */}
          {showProducts && currentVideo.linkedProducts.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-[40vh] overflow-y-auto animate-slide-up">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <h4 className="font-bold text-lg mb-4">Sản phẩm trong video</h4>
              <div className="space-y-3">
                {currentVideo.linkedProducts.map((product) => (
                  <button
                    key={product._id}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-red-600 font-bold mt-1">
                        {product.price.toLocaleString()}đ
                      </p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Swipe Gesture Handler (Mobile) */}
      <div
        className="md:hidden absolute inset-0 z-10 pointer-events-auto"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          const startY = touch.clientY;

          const handleTouchMove = (e) => {
            const currentY = e.touches[0].clientY;
            const diff = startY - currentY;

            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                handleNext();
              } else {
                handlePrevious();
              }
              document.removeEventListener("touchmove", handleTouchMove);
            }
          };

          document.addEventListener("touchmove", handleTouchMove);
          document.addEventListener(
            "touchend",
            () => {
              document.removeEventListener("touchmove", handleTouchMove);
            },
            { once: true }
          );
        }}
      />

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ShortVideoPlayerModal;
