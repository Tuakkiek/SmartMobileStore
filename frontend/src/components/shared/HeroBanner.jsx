import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

import { getImageUrl } from "@/lib/imageUtils";
// ============================================
// COMPONENT: HeroBanner (ĐÃ SỬA NÚT BẤM)
// ============================================
const HeroBanner = ({
  imageSrc,
  alt,
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
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    const currentRef = bannerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className={cn(
        "relative w-full overflow-hidden group",
        "aspect-[24/9]",
        className
      )}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <a href={ctaLink} className="w-full h-full" onClick={() => {}}>
          <img
            src={getImageUrl(imageSrc)}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </a>
      </div>

      {/* Content Overlay */}
      {(title || subtitle || ctaText) && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-end text-center px-4 transition-all duration-1000 pb-16",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {ctaText && ctaLink && (
            <Button
              variant="default"
              className={cn(
                "bg-white/30 text-black hover:bg-white/50 backdrop-blur-lg font-semibold rounded-full transition-all duration-300 hover:scale-105 shadow-lg",
                "h-10 px-6 text-sm",
                "md:h-12 md:px-8 md:text-base"
              )}
              onClick={() => (window.location.href = ctaLink)}
            >
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENT: HeroBannerCarousel (Giữ nguyên)
// ============================================
const HeroBannerCarousel = ({ banners, onSlideChange }) => {
  // // Dữ liệu banners
  // const banners = [
  //   {
  //     imageSrc: "/ip17pm.png",
  //     alt: "iPhone 17 Pro Max",
  //     ctaLink: "/dien-thoai/iphone-17-pro-256gb?sku=00000279",
  //   },
  //   {
  //     imageSrc: "/ipAir.png",
  //     alt: "iPhone Air",
  //     ctaLink: "/dien-thoai/iphone-air-256gb?sku=00000425",
  //   },
  //   {
  //     imageSrc: "/ip17.png",
  //     alt: "iPhone 17",
  //     ctaLink: "/dien-thoai/iphone-17-256gb?sku=00000300",
  //   },
  // ]; // State cho carousel

  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true); // Cấu hình Autoplay

  const plugin = useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  ); // Lắng nghe các sự kiện từ carousel

  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      const selected = api.selectedScrollSnap();
      setCurrent(selected);
      if (onSlideChange) onSlideChange(selected);
    };
    api.on("select", onSelect);
    setCurrent(api.selectedScrollSnap());

    const onPlay = () => setIsAutoPlaying(true);
    const onStop = () => setIsAutoPlaying(false);
    api.on("autoplay:play", onPlay);
    api.on("autoplay:stop", onStop);

    return () => {
      api.off("select", onSelect);
      api.off("autoplay:play", onPlay);
      api.off("autoplay:stop", onStop);
    };
  }, [api, onSlideChange]);

  const toggleAutoplay = () => {
    const player = plugin.current;
    if (!player) return;
    if (player.isPlaying()) {
      player.stop();
    } else {
      player.play();
    }
  };

  const defaultBanners = [
    {
      imageSrc: "/ip17pm.png",
      alt: "iPhone 17 Pro Max",
      ctaLink: "/dien-thoai/iphone-17-pro-256gb?sku=00000279",
    },
    {
      imageSrc: "/ipAir.png",
      alt: "iPhone Air",
      ctaLink: "/dien-thoai/iphone-air-256gb?sku=00000425",
    },
    {
      imageSrc: "/ip17.png",
      alt: "iPhone 17",
      ctaLink: "/dien-thoai/iphone-17-256gb?sku=00000300",
    },
  ];

  const displayBanners =
    banners && banners.length > 0 ? banners : defaultBanners;

  const goToSlide = (index) => {
    api?.scrollTo(index);
  };

  return (
    <div className="relative w-full mb-2.5 group/carousel">
           {" "}
      <Carousel
        setApi={setApi}
        plugins={[plugin.current]}
        opts={{
          loop: true,
        }}
        className="relative overflow-hidden md:rounded-none"
      >
               {" "}
        <CarouselContent>
                   {" "}
          {banners.map((banner, index) => (
            <CarouselItem key={index}>
                           {" "}
              <HeroBanner
                imageSrc={banner.imageSrc}
                alt={banner.alt}
                title={banner.title}
                subtitle={banner.subtitle}
                ctaText={banner.ctaText}
                ctaLink={banner.ctaLink}
              />
                         {" "}
            </CarouselItem>
          ))}
                 {" "}
        </CarouselContent>
               {" "}
        <CarouselPrevious
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 
                     bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm 
                     rounded-full w-12 h-12 opacity-0 group-hover/carousel:opacity-100 
                     transition-opacity duration-300"
        />
         {" "}
        <CarouselNext
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 
                     bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm 
                     rounded-full w-12 h-12 opacity-0 group-hover/carousel:opacity-100 
                  t  transition-opacity duration-300"
        />
               {" "}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                   {" "}
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300",
                current === index
                  ? "bg-slate-950 w-6 md:w-8"
                  : "bg-gray-400 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
                 
        </div>
             
      </Carousel>
       
    </div>
  );
};

export { HeroBanner, HeroBannerCarousel };
