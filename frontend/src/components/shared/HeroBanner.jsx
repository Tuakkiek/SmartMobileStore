// ============================================
// FILE: src/components/shared/HeroBanner.jsx
// ============================================
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HeroBanner = ({
  imageSrc,
  alt,
  height = 580,
  title,
  subtitle,
  ctaText,
  ctaLink,
  className,
}) => {
  const bannerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (bannerRef.current) {
      observer.observe(bannerRef.current);
    }

    return () => {
      if (bannerRef.current) {
        observer.unobserve(bannerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className={cn("relative w-full overflow-hidden group", className)}
      style={{ height: `${height}px` }}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Content Overlay */}
      {(title || subtitle || ctaText) && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center text-center px-4 transition-all duration-1000",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {ctaText && ctaLink && (
            <Button
              variant="default"
              size="lg"
              className="mt-96 bg-white/30 text-black hover:bg-white/50 backdrop-blur-lg font-semibold rounded-full px-10 h-14 text-lg transition-all duration-300 hover:scale-105 shadow-lg"
              onClick={() => (window.location.href = ctaLink)}
            >
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Carousel Component
const HeroBannerCarousel = ({ onSlideChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const banners = [
    {
      imageSrc: "/ip17pm.png",
      alt: "iPhone 17 Pro Max",
      height: 580,
      ctaText: "Tìm hiểu thêm",
      ctaLink: "/dien-thoai/iphone-17-pro-256gb?sku=00000279",
    },
    {
      imageSrc: "/ipAir.png",
      alt: "iPhone Air",
      height: 580,
      ctaText: "Khám phá ngay",
      ctaLink: "/dien-thoai/iphone-air-256gb?sku=00000425",
    },
    {
      imageSrc: "/ip17.png",
      alt: "iPhone 17",
      height: 580,
      ctaText: "Xem chi tiết",
      ctaLink: "/dien-thoai/iphone-17-256gb?sku=00000300",
    },
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const newIndex = (prevIndex + 1) % banners.length;
        if (onSlideChange) onSlideChange(newIndex);
        return newIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length, onSlideChange]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex === 0 ? banners.length - 1 : prevIndex - 1;
      if (onSlideChange) onSlideChange(newIndex);
      return newIndex;
    });
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % banners.length;
      if (onSlideChange) onSlideChange(newIndex);
      return newIndex;
    });
  };

  const goToSlide = (index) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    if (onSlideChange) onSlideChange(index);
  };

  return (
    <div className="relative w-full mb-2.5 group/carousel">
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-none md:rounded-2xl">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <div key={index} className="min-w-full">
              <HeroBanner
                imageSrc={banner.imageSrc}
                alt={banner.alt}
                height={banner.height}
                title={banner.title}
                subtitle={banner.subtitle}
                ctaText={banner.ctaText}
                ctaLink={banner.ctaLink}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full w-12 h-12 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full w-12 h-12 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
        onClick={goToNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300",
              currentIndex === index
                ? "bg-white w-6 md:w-8"
                : "bg-white/50 hover:bg-white/75"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Pause/Play Button */}
      <button
        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        className="hidden md:block absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
      >
        {isAutoPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
};

export { HeroBanner, HeroBannerCarousel };
