// ============================================
// FILE: src/components/shared/SecondaryBanners.jsx
// ============================================
import React from "react";
import { cn } from "@/lib/utils";

const SecondaryBanners = ({ slideIndex = 0 }) => {
  const bannersBySlide = {
    0: [
      {
        imageSrc: "/ip16e.png",
        alt: "iPhone 16e Accessories",
        link: "/products?category=Accessories",
        height: "200px",
      },
      {
        imageSrc: "/ip16e.png",
        alt: "Apple Watch",
        link: "/products?category=AppleWatch",
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
              "relative w-full overflow-hidden rounded-2xl group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
              banner.className
            )}
            style={{ height: banner.height || "200px" }}
          >
            {/* HÌNH ẢNH CHÍNH - THÊM VÀO ĐÂY */}
            <img
              src={banner.imageSrc}
              alt={banner.alt}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback nếu ảnh không load được
                e.target.style.display = "none";
              }}
            />

            {/* Overlay khi hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* TEXT OVERLAY - CHỈ HIỂN THỊ KHI KHÔNG CÓ ẢNH HOẶC HOVER */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
              <div className="text-center bg-black/20 bg-opacity-0 group-hover:bg-opacity-100 rounded-lg p-2 transition-all">
                <p className="text-white text-sm font-semibold mb-1">
                  {banner.alt || "Xem chi tiết"}
                </p>
                <p className="text-white/80 text-xs">Nhấn để xem</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SecondaryBanners;