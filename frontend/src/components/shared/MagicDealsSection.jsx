// ============================================
// FILE: src/components/shared/MagicDealsSection.jsx
// ✅ UPDATED: Hiển thị 8 sản phẩm có % giảm giá cao nhất
// ============================================

import { getImageUrl } from "@/lib/imageUtils";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const MagicDealsSection = ({ config = {}, allProducts = [] }) => {
  const navigate = useNavigate();

  // Banner chính (giữ nguyên)
  const mainBanner = config.images?.[0] || "/banner_chinh1.png";

  // ============================================
  // TÍNH TOÁN 8 SẢN PHẨM CÓ % GIẢM GIÁ CAO NHẤT
  // ============================================
  const topDiscountProducts = useMemo(() => {
    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      return [];
    }

    // Lọc và tính % giảm giá cho từng sản phẩm
    const productsWithDiscount = allProducts
      .map((product) => {
        // Lấy variant đầu tiên để tính giảm giá
        const variant = product.variants?.[0];
        if (!variant) return null;

        const originalPrice = variant.originalPrice || 0;
        const price = variant.price || 0;

        // Chỉ lấy sản phẩm có giảm giá
        if (originalPrice <= price || originalPrice === 0) return null;

        const discountPercent = Math.round(
          ((originalPrice - price) / originalPrice) * 100
        );

        return {
          ...product,
          variant,
          discountPercent,
          image:
            variant.images?.[0] || product.images?.[0] || "/placeholder.png",
        };
      })
      .filter((p) => p !== null && p.discountPercent > 0);

    // Sắp xếp theo % giảm giá giảm dần và lấy 8 sản phẩm đầu
    return productsWithDiscount
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 8);
  }, [allProducts]);

  // ============================================
  // XỬ LÝ CLICK VÀO SẢN PHẨM
  // ============================================
  const handleProductClick = (product) => {
    const categoryPath = {
      iPhone: "dien-thoai",
      iPad: "may-tinh-bang",
      Mac: "macbook",
      AppleWatch: "apple-watch",
      AirPods: "tai-nghe",
      Accessories: "phu-kien",
    }[product.category];

    if (!categoryPath) {
      console.warn("Unknown category:", product.category);
      return;
    }

    const variant = product.variant;
    if (variant?.sku && variant?.slug) {
      navigate(`/${categoryPath}/${variant.slug}?sku=${variant.sku}`);
    } else if (product.baseSlug) {
      navigate(`/${categoryPath}/${product.baseSlug}`);
    }
  };

  return (
    <div className="bg-gray-50 py-6 px-4 rounded-xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Tiêu đề cho phần giảm giá - ĐÃ CHỈNH SỬA */}
        <div className="col-span-1 md:col-span-4 text-center mb-6">
          <h1
            className="
          text-4xl
          sm:text-5xl
          font-extrabold
          text-transparent
          bg-clip-text
          bg-gradient-to-r from-red-900 to-black
          inline-block
          p-2
          border-b-4 border-stone-600
          transform hover:scale-105 transition duration-300
        "
          >
            Khám Phá Sản Phẩm Giảm Giá Hot Nhất
          </h1>
          <p
            className="
          text-gray-600
          mt-3
          text-lg
          max-w-xl
          mx-auto
          relative
          after:content-['']
          after:absolute
          after:bottom-0
          after:left-1/2
          after:-translate-x-1/2
          after:w-16
          after:h-0.5
         
        "
          >
            Cơ hội tuyệt vời để sở hữu những sản phẩm yêu thích với mức giá ưu
            đãi
          </p>
        </div>

        {/* ==========================================
          BANNER BÊN TRÁI - GIỮ NGUYÊN
          ========================================== */}
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

        {/* ==========================================
          8 SẢN PHẨM GIẢM GIÁ - THAY ĐỔI
          ========================================== */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Khối 1: 4 sản phẩm đầu */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            {topDiscountProducts.slice(0, 4).map((product, i) => (
              <div
                key={`product-1-${i}`}
                className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <img
                  src={getImageUrl(product.image)}
                  alt={product.name}
                  className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                />
                {/* Badge giảm giá */}
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10">
                  -{product.discountPercent}%
                </div>
                {/* Overlay khi hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
              </div>
            ))}
          </div>

          {/* Khối 2: 4 sản phẩm sau */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            {topDiscountProducts.slice(4, 8).map((product, i) => (
              <div
                key={`product-2-${i}`}
                className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <img
                  src={getImageUrl(product.image)}
                  alt={product.name}
                  className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                />
                {/* Badge giảm giá */}
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10">
                  -{product.discountPercent}%
                </div>
                {/* Overlay khi hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hiển thị message nếu không có sản phẩm giảm giá */}
      {topDiscountProducts.length === 0 && (
        <div className="text-center text-gray-500 mt-4 text-sm">
          Chưa có sản phẩm giảm giá
        </div>
      )}
    </div>
  );
};

export default MagicDealsSection;
