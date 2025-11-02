// ============================================
// FILE: src/components/shared/SecondaryBanners.jsx
// ============================================
import React from "react";
import { cn } from "@/lib/utils";

const SecondaryBanners = ({ slideIndex = 0 }) => {
  // Mỗi slide của hero banner có các secondary banner riêng
  const bannersBySlide = {
    0: [
      // Slide 1 - iPhone 17 Pro Max
      {
        imageSrc: "/banners/fridge.png",
        alt: "Tủ lạnh - Điện Máy FPT",
        link: "/products?category=Accessories",
        height: "200px",
      },
      {
        imageSrc: "/banners/venu4.png",
        alt: "VENU 4 - Đồng hồ thông minh",
        link: "/products?category=AppleWatch",
        height: "200px",
      },
    ],
    1: [
      // Slide 2 - iPhone Air
      {
        imageSrc: "/banners/water-filter.png",
        alt: "Máy lọc nước",
        link: "/products?category=Accessories",
        height: "200px",
      },
      {
        imageSrc: "/banners/venu4.png",
        alt: "VENU 4",
        link: "/products?category=AppleWatch",
        height: "200px",
      },
    ],
    2: [
      // Slide 3 - iPhone 17
      {
        imageSrc: "/banners/gaming-laptop.png",
        alt: "Laptop Gaming X2",
        link: "/products?category=Mac",
        height: "200px",
      },
      {
        imageSrc: "/banners/honor-x7d.png",
        alt: "HONOR X7d",
        link: "/products?category=iPhone",
        height: "200px",
      },
    ],
  };

  const currentBanners = bannersBySlide[slideIndex] || bannersBySlide[0];

  return (
    <div className="container mx-auto px-4 -mt-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentBanners.map((banner, index) => (
          <button
            key={index}
            onClick={() => banner.link && (window.location.href = banner.link)}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br from-gray-100 to-gray-200",
              banner.className
            )}
            style={{ height: banner.height || "200px" }}
          >
            {/* Placeholder với gradient và text */}
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="text-center">
                <p className="text-gray-600 text-base font-semibold mb-1">
                  {banner.alt}
                </p>
                <p className="text-gray-400 text-xs">Nhấn để xem chi tiết</p>
              </div>
            </div>

            {/* Overlay khi hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SecondaryBanners;
