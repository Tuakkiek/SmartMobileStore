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
  const [current, setCurrent] = useState(0); // Sẽ là 0 hoặc 1
  const plugin = useRef(
    Autoplay({
      delay: 4000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  );

  // === THAY ĐỔI 1: Định nghĩa số slide cuộn và số trang ===
  // Đặt hằng số để dễ dàng thay đổi và tính toán
  const SLIDES_TO_SCROLL = 1;
  // Tính toán số lượng "trang" (dots) cần hiển thị
  // Math.ceil đảm bảo rằng ngay cả khi bạn có 5 banner (5/2 = 2.5), nó sẽ làm tròn thành 3 trang.
  const numPages = Math.ceil(banners.length / SLIDES_TO_SCROLL);
  // ========================================================

  // 3. Effect và Hàm
  useEffect(() => {
    if (!api) {
      return;
    }
    const onSelect = () => {
      // api.selectedScrollSnap() trả về index của "trang" (snap)
      setCurrent(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    setCurrent(api.selectedScrollSnap());
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const goToSlide = (index) => {
    // scrollTo(index) sẽ cuộn đến "trang" có index đó
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
                  "relative w-full overflow-hidden rounded-2xl group/banner transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
                  "aspect-[21/9]" // Thêm tỷ lệ co dãn
                )}
              >
                <img
                  src={banner.imageSrc}
                  alt={banner.alt}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target.style.display = "none")}
                />
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

      {/* === THAY ĐỔI 2: Logic render Dots === */}
      <div className="flex gap-2 mt-3 justify-center">
        {/* Thay vì .map qua 'banners', chúng ta tạo một mảng tạm
          có độ dài bằng 'numPages' (trong trường hợp này là 2)
        */}
        {Array.from({ length: numPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)} // i ở đây sẽ là 0 hoặc 1
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              current === i // So sánh current (0 hoặc 1) với i (0 hoặc 1)
                ? "bg-slate-900 w-6"
                : "bg-gray-400 hover:bg-gray-600"
            )}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>
      {/* ======================================= */}
    </div>
  );
};

export default SecondaryBanners;
