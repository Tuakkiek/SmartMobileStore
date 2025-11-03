// ============================================
// FILE: src/components/shared/SecondaryBanners.jsx
// ============================================
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SecondaryBanners = () => {
  const banners = [
    {
      imageSrc: "/ip16e.png",
      alt: "iPhone 16e",
      link: "/products?category=Accessories",
      height: "220px",
    },
    {
      imageSrc: "/cpuA19.png",
      alt: "Apple Watch",
      link: "/products?category=AppleWatch",
      height: "220px",
    },
    {
      imageSrc: "/ip17pm.png",
      alt: "AirPods Pro",
      link: "/products?category=AirPods",
      height: "220px",
    },
  ];

  const total = banners.length;

  // clone để tạo vòng lặp mượt
  const extended = [banners[total - 1], ...banners, banners[0]];

  const [index, setIndex] = useState(1); // bắt đầu ở banner thật đầu tiên
  const [transitioning, setTransitioning] = useState(true);
  const intervalRef = useRef(null);

  // Auto slide
  useEffect(() => {
    startAutoSlide();
    return stopAutoSlide;
  }, []);

  const startAutoSlide = () => {
    stopAutoSlide();
    intervalRef.current = setInterval(() => {
      setIndex((prev) => prev + 1);
      setTransitioning(true);
    }, 3000);
  };

  const stopAutoSlide = () => {
    clearInterval(intervalRef.current);
  };

  // Reset khi trượt đến clone
  const handleTransitionEnd = () => {
    if (index === total + 1) {
      setTransitioning(false);
      setIndex(1);
    } else if (index === 0) {
      setTransitioning(false);
      setIndex(total);
    }
  };

  // Khi chuyển index không có transition (reset tức thì)
  useEffect(() => {
    if (!transitioning) {
      const timeout = setTimeout(() => {
        setTransitioning(true);
      }, 20);
      return () => clearTimeout(timeout);
    }
  }, [transitioning]);

  const goToNext = () => {
    setIndex((prev) => prev + 1);
    setTransitioning(true);
    restartTimer();
  };

  const goToPrevious = () => {
    setIndex((prev) => prev - 1);
    setTransitioning(true);
    restartTimer();
  };

  const goToSlide = (i) => {
    setIndex(i + 1);
    setTransitioning(true);
    restartTimer();
  };

  const restartTimer = () => {
    stopAutoSlide();
    startAutoSlide();
  };

  return (
    <div className="w-full flex flex-col items-center -mt-5 mb-4 group/secondary">
      <div className="relative w-full max-w-5xl px-1 overflow-hidden">
        <div
          className={cn(
            "flex",
            transitioning ? "transition-transform duration-700 ease-in-out" : ""
          )}
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `translateX(-${index * 50}%)`, // mỗi banner chiếm 50%
          }}
        >
          {extended.map((banner, i) => (
<div key={i} className="w-1/2 flex-shrink-0 px-2">
              <button
                onClick={() => banner.link && (window.location.href = banner.link)}
                className={cn(
                  "relative w-full overflow-hidden rounded-2xl group/banner transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                )}
                style={{ height: banner.height }}
              >
                <img
                  src={banner.imageSrc}
                  alt={banner.alt}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target.style.display = "none")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/banner:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <div className="text-center bg-black/20 group-hover/banner:bg-black/40 rounded-lg p-2 transition-all">
                    <p className="text-white text-sm font-semibold mb-1">
                      {banner.alt}
                    </p>
                    <p className="text-white/80 text-xs">Nhấn để xem</p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Nút Trái */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 
                     bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm 
                     rounded-full w-10 h-10 opacity-0 group-hover/secondary:opacity-100 
                     transition-opacity duration-300 z-10"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Nút Phải */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 
                     bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm 
                     rounded-full w-10 h-10 opacity-0 group-hover/secondary:opacity-100 
                     transition-opacity duration-300 z-10"
          onClick={goToNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-3">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === i + 1 ? "bg-blue-600 w-6" : "bg-gray-400 hover:bg-gray-600"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SecondaryBanners;