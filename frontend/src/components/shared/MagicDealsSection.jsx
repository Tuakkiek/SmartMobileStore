// ============================================
// FILE: src/components/shared/MagicDealsSection.jsx
// Có hiệu ứng hover mượt mà cho banner & sản phẩm
// ============================================

import { getImageUrl } from "@/lib/imageUtils";
import React from "react";

const MagicDealsSection = ({ config = {} }) => {
  // Default images nếu không có config
  const defaultImages = [
    "/banner_chinh1.png",
    "/iphone_17_pro_bac.png",
    "/ipad_air_xanh.png",
    "/mac.png",
    "/airpods.png",
    "/op_ip_17_pro.png",
    "/day_deo.png",
    "/sac_magsafe.png",
    "/pin_magsafe.png",
  ];

  // Lấy images từ config hoặc dùng default
  const images =
    config.images && config.images.length > 0 ? config.images : defaultImages;

  // Chia images thành 3 phần: banner chính + 2 khối danh mục
  const mainBanner = images[0];
  const categoryBlock1 = images.slice(1, 5); // 4 ảnh
  const categoryBlock2 = images.slice(5, 9); // 4 ảnh

  return (
    <div className="bg-gray-50 py-6 px-4 rounded-xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Banner bên trái */}
        <div className="col-span-1 md:col-span-2">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md group">
            <img
              src={getImageUrl(mainBanner)}
              alt="Main Banner"
              className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        </div>

        {/* Danh mục bên phải */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Khối danh mục 1 */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            {categoryBlock1.map((src, i) => (
              <div
                key={`cat1-${i}`}
                className="aspect-square bg-gray-100 rounded-xl overflow-hidden group"
              >
                <img
                  src={getImageUrl(src)}
                  alt={`Category 1-${i + 1}`}
                  className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                />
              </div>
            ))}
          </div>

          {/* Khối danh mục 2 */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            {categoryBlock2.map((src, i) => (
              <div
                key={`cat2-${i}`}
                className="aspect-square bg-gray-100 rounded-xl overflow-hidden group"
              >
                <img
                  src={getImageUrl(src)}
                  alt={`Category 2-${i + 1}`}
                  className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicDealsSection;
