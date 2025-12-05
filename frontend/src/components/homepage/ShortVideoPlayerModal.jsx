import React, { useState, useRef, useEffect } from "react";
import { X, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";

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

const ShortVideoPlayerModal = ({
  open,
  onClose,
  initialIndex = 0,
  videos = [],
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const currentVideo = videos[currentIndex];

  // Auto-play video
  useEffect(() => {
    if (open && videoRef.current && currentVideo) {
      videoRef.current
        .play()
        .catch((err) => console.log("Autoplay prevented:", err));
    }
  }, [open, currentIndex, currentVideo]);

  // ✅ KEYBOARD NAVIGATION
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, videos.length]);

  // ✅ SCROLL/WHEEL NAVIGATION
  useEffect(() => {
    if (!open) return;

    let isScrolling = false;
    const handleWheel = (e) => {
      if (isScrolling) return;

      e.preventDefault();
      isScrolling = true;

      if (e.deltaY > 0) {
        handleNext();
      } else if (e.deltaY < 0) {
        handlePrevious();
      }

      setTimeout(() => {
        isScrolling = false;
      }, 500);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [open, currentIndex, videos.length]);

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!open || !currentVideo) return null;

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
            src={getMediaUrl(currentVideo.videoUrl)}
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
            onError={(e) => {
              console.error("❌ Video load error:", currentVideo.videoUrl);
            }}
          />

          {/* Bottom Gradient Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

          {/* Video Info (Bottom Left) */}
          <div className="absolute bottom-0 left-0 right-16 p-4 text-white space-y-2">
            <h3 className="font-bold text-lg line-clamp-2">
              {currentVideo.title}
            </h3>
            {currentVideo.description && (
              <p className="text-sm text-gray-300 line-clamp-2">
                {currentVideo.description}
              </p>
            )}
          </div>

          {/* Mute Button (Bottom Right) */}
          <div className="absolute right-4 bottom-4">
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
            {currentIndex < videos.length - 1 && (
              <button
                onClick={handleNext}
                className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 flex items-center justify-center text-white transition-colors pointer-events-auto"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Video Counter */}
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white font-semibold">
            {currentIndex + 1} / {videos.length}
          </div>
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

      {/* Hint Text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center">
        <p className="hidden md:block">
          Dùng phím mũi tên ↑↓ hoặc lăn chuột để chuyển video
        </p>
        <p className="md:hidden">Vuốt lên/xuống để chuyển video</p>
      </div>
    </div>
  );
};

export default ShortVideoPlayerModal;
