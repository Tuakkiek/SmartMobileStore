import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils"; // Giả định bạn có hàm cn này
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // Giả định bạn có các component này

const SecondaryBanners = () => {
  // 1. Dữ liệu banners
  const banners = [
    {
      imageSrc: "/ip16e.png",
      link: "/products?category=Accessories",
      alt: "iPhone 16",
    },
    {
      imageSrc: "/cpuA19.png",
      link: "/products?category=AppleWatch",
      alt: "Apple A19 Pro",
    },
    {
      imageSrc: "/macpro14.png",
      link: "/products?category=AirPods",
      alt: "MacBook Pro",
    },
    {
      imageSrc: "/banner_phu_ip17pro.png",
      link: "/products?category=iPhone",
      alt: "iPhone 17 Pro",
    },
  ];

  // 2. State và Cấu hình
  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);
  const plugin = useRef(
    Autoplay({
      delay: 4000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  );

  // Logic tính toán số trang (Dots)
  const SLIDES_TO_SCROLL = 1;
  const numPages = Math.ceil(banners.length / SLIDES_TO_SCROLL);

  // 3. Effect và Hàm
  useEffect(() => {
    if (!api) {
      return;
    }
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    setCurrent(api.selectedScrollSnap());
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const goToSlide = (index) => {
    api?.scrollTo(index);
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center -mt-5 mb-4 group/secondary">
      <Carousel
        setApi={setApi}
        plugins={[plugin.current]}
        opts={{
          loop: true,
          slidesToScroll: SLIDES_TO_SCROLL,
        }}
        className="relative w-full  px-1"
      >
        <CarouselContent>
          {banners.map((banner, i) => (
            <CarouselItem
              key={i}
              className="basis-1/2 px-2 flex justify-center" // Căn giữa carousel items
            >
              <button
                onClick={() =>
                  banner.link && (window.location.href = banner.link)
                }
                className={cn(
                  // === THAY ĐỔI 1: GỠ BỎ hover:scale-[1.02] ===
                  "relative w-full overflow-hidden rounded-2xl group/banner transition-all duration-300 hover:shadow-lg",
                  "aspect-[21/9]" // Thêm tỷ lệ co dãn
                )}
              >
                <img
                  src={banner.imageSrc}
                  alt={banner.alt}
                  // === THAY ĐỔI 2: THÊM HIỆU ỨNG VÀO <img> ===
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/banner:scale-[1.02]"
                  onError={(e) => (e.target.style.display = "none")}
                />
                {/* --- Các lớp overlay (giữ nguyên) --- */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/banner:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4 pointer-events-none">
                  <div className="text-center bg-black/20 group-hover/banner:bg-black/40 rounded-lg p-2 transition-all">
                    <p className="text-white text-xs md:text-sm font-semibold mb-1">
                      {banner.alt}
                    </p>
                    <p className="text-white/80 text-[10px] md:text-xs">
                      Nhấn để xem
                    </p>
                  </div>
                </div>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full w-10 h-10 opacity-0 group-hover/secondary:opacity-100 transition-opacity duration-300 z-10" />
        <CarouselNext className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full w-10 h-10 opacity-0 group-hover/secondary:opacity-100 transition-opacity duration-300 z-10" />
      </Carousel>

      {/* Dots (giữ nguyên) */}
      <div className="flex gap-2 mt-3 justify-center">
        {Array.from({ length: numPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              current === i
                ? "bg-slate-900 w-6"
                : "bg-gray-400 hover:bg-gray-600"
            )}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SecondaryBanners;