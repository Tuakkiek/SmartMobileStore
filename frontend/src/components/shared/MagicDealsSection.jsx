// ============================================
// FILE: src/components/shared/MagicDealsSection.jsx
// ✅ FIXED: Logic tính giảm giá và hiển thị sản phẩm
// ============================================

import { getImageUrl } from "@/lib/imageUtils";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const MagicDealsSection = ({ config = {}, allProducts = [] }) => {
  const navigate = useNavigate();

  // Banner chính
  const mainBanner = config.images?.[0] || "/banner_chinh1.png";

  // ============================================
  // TÍNH TOÁN 8 SẢN PHẨM CÓ % GIẢM GIÁ CAO NHẤT
  // ============================================
  const topDiscountProducts = useMemo(() => {
    console.log("🔍 MagicDeals: Processing products...", {
      totalProducts: allProducts.length,
    });

    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      console.warn("⚠️ No products available for MagicDeals");
      return [];
    }

    // Lọc và tính % giảm giá cho TẤT CẢ VARIANTS
    const productsWithDiscount = [];

    allProducts.forEach((product) => {
      if (!product.variants || product.variants.length === 0) {
        return;
      }

      // Duyệt qua TẤT CẢ variants của sản phẩm
      product.variants.forEach((variant) => {
        const originalPrice = variant.originalPrice || 0;
        const price = variant.price || 0;

        // Kiểm tra có giảm giá không
        if (originalPrice <= price || originalPrice === 0 || price === 0) {
          return;
        }

        const discountPercent = Math.round(
          ((originalPrice - price) / originalPrice) * 100
        );

        // Chỉ lấy sản phẩm có giảm giá > 0%
        if (discountPercent <= 0) return;

        productsWithDiscount.push({
          ...product,
          variant,
          discountPercent,
          displayPrice: price,
          displayOriginalPrice: originalPrice,
          image:
            variant.images?.[0] || product.images?.[0] || "/placeholder.png",
          displayName: `${product.name} ${variant.color || ""} ${
            variant.storage || ""
          }`.trim(),
        });
      });
    });

    console.log("✅ MagicDeals: Found discount products:", {
      count: productsWithDiscount.length,
      topDiscounts: productsWithDiscount.slice(0, 3).map((p) => ({
        name: p.displayName,
        discount: p.discountPercent,
      })),
    });

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
    } else {
      // Fallback: navigate to category page
      navigate(`/products?category=${product.category}`);
    }
  };

  return (
    <div className="bg-gray-50 py-6 px-4 rounded-xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Tiêu đề */}
        <div className="col-span-1 md:col-span-4 text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-900 to-black inline-block p-2 border-b-4 border-stone-600 transform hover:scale-105 transition duration-300">
            Khám Phá Sản Phẩm Giảm Giá Hot Nhất
          </h1>
          <p className="text-gray-600 mt-3 text-lg max-w-xl mx-auto">
            Cơ hội tuyệt vời để sở hữu những sản phẩm yêu thích với mức giá ưu
            đãi
          </p>
        </div>

        {/* BANNER BÊN TRÁI */}
        <div className="col-span-1 md:col-span-2">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md group">
            <img
              src={getImageUrl(mainBanner)}
              alt="Main Banner"
              className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              onError={(e) => {
                console.error("Banner load error:", mainBanner);
                e.target.src = "/placeholder.png";
              }}
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        </div>

        {/* 8 SẢN PHẨM GIẢM GIÁ */}
        {topDiscountProducts.length > 0 ? (
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Khối 1: 4 sản phẩm đầu */}
            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              {topDiscountProducts.slice(0, 4).map((product, i) => (
                <div
                  key={`product-1-${i}-${product.variant?._id}`}
                  className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group cursor-pointer"
                  onClick={() => handleProductClick(product)}
                  title={product.displayName}
                >
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.displayName}
                    className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                    }}
                  />
                  {/* Badge giảm giá */}
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10">
                    -{product.discountPercent}%
                  </div>
                  {/* Product name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs font-semibold line-clamp-2">
                      {product.displayName}
                    </p>
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
                  key={`product-2-${i}-${product.variant?._id}`}
                  className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group cursor-pointer"
                  onClick={() => handleProductClick(product)}
                  title={product.displayName}
                >
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.displayName}
                    className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                    }}
                  />
                  {/* Badge giảm giá */}
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10">
                    -{product.discountPercent}%
                  </div>
                  {/* Product name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs font-semibold line-clamp-2">
                      {product.displayName}
                    </p>
                  </div>
                  {/* Overlay khi hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Hiển thị placeholder khi không có sản phẩm */
          <div className="col-span-1 md:col-span-2 flex items-center justify-center bg-white rounded-xl shadow-sm p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-gray-500 text-lg font-semibold">
                Chưa có sản phẩm giảm giá
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Hãy quay lại sau để không bỏ lỡ ưu đãi!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicDealsSection;
