// ============================================
// FILE: frontend/src/components/shared/CategoryDropdown.jsx
// (Đã cập nhật responsive và dùng ảnh)
// ============================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Package, X } from "lucide-react"; // Bỏ icon cũ, thêm X

// Giả lập API
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  "Apple Watch": appleWatchAPI,
  "Phụ Kiện": accessoryAPI,
};

const categories = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "Apple Watch",
  "Phụ Kiện",
];

// ============================================
// THAY ĐỔI 1: Dùng ảnh thay cho Icon
// ============================================
const CATEGORY_IMAGES = {
  iPhone: "/iphone_17_pro_bac.png",
  iPad: "/ipad_air_xanh.png",
  Mac: "/mac.png",
  AirPods: "/airpods.png",
  "Apple Watch": "/applewatch.png",
  "Phụ Kiện": "/op_ip_17_pro.png",
};

// Map tên danh mục (logic) → tên (hiển thị)
const CATEGORY_DISPLAY_MAP = {
  iPhone: "iPhone",
  iPad: "iPad",
  Mac: "Mac",
  AirPods: "AirPods",
  "Apple Watch": "Apple Watch",
  "Phụ Kiện": "Phụ Kiện",
};

// Map tên danh mục → URL param
const CATEGORY_PARAM_MAP = {
  iPhone: "iPhone",
  iPad: "iPad",
  Mac: "Mac",
  AirPods: "AirPods",
  "Apple Watch": "AppleWatch",
  "Phụ Kiện": "Accessories",
};

const CategoryDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0); // 0 = iPhone
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // ============================================
  // LOGIC (Giữ nguyên)
  // (getSeriesKey, getRepresentativeImage, groupBySeries)
  // ============================================
  const getSeriesKey = (name, category) => {
    const patterns = {
      iPhone: /iPhone\s+(\d+)/i,
      iPad: /iPad\s+(Pro|Air|\(?\d+\)?)/i,
      Mac: /MacBook\s+(Air|Pro)|iMac/i,
      "Apple Watch": /Apple Watch\s+(Ultra|Series\s*\d+|SE)/i,
      AirPods: /AirPods\s+(Pro|Max|\(\d+\))/i,
    };

    const match = name.match(patterns[category]);
    if (!match) return "Khác";

    if (category === "iPhone") return `iPhone ${match[1]} Series`;
    if (category === "iPad") {
      if (name.includes("Pro"))
        return `iPad Pro ${match[1].replace(/[^\d.]/g, "")}-inch`;
      if (name.includes("Air"))
        return `iPad Air (${match[1].replace(/[^\d]/g, "")})`;
      return `iPad (${match[1].replace(/[^\d]/g, "")})`;
    }
    if (category === "Mac") {
      if (name.includes("MacBook Pro"))
        return `MacBook Pro ${name.match(/14|16/)?.[0]}-inch (2023)`;
      if (name.includes("MacBook Air")) return "MacBook Air (2023)";
      if (name.includes("iMac")) return "iMac 24-inch (2023)";
    }
    if (category === "Apple Watch") {
      if (name.includes("Ultra")) return "Apple Watch Ultra";
      if (name.includes("SE")) return "Apple Watch SE (2nd)";
      return `Apple Watch Series ${match[1].match(/\d+/)?.[0]}`;
    }
    if (category === "AirPods") {
      if (name.includes("Pro") && name.includes("2nd"))
        return "AirPods Pro (2nd)";
      if (name.includes("Pro")) return "AirPods Pro (1st)";
      if (name.includes("Max")) return "AirPods Max";
      return `AirPods (${match[1].replace(/[^\d]/g, "")})`;
    }
    return match[0];
  };

  const getRepresentativeImage = (products) => {
    const priority = ["Pro Max", "Pro", "Max", "Ultra", "Plus", ""];
    for (const term of priority) {
      const match = products.find((p) => p.name.includes(term));
      if (match) {
        return match.images?.[0] || match.variants?.[0]?.images?.[0] || "";
      }
    }
    return (
      products[0]?.images?.[0] || products[0]?.variants?.[0]?.images?.[0] || ""
    );
  };

  const groupBySeries = (products, categoryName) => {
    const groups = {};
    products.forEach((product) => {
      const seriesKey = getSeriesKey(
        product.name || product.model,
        categoryName
      );
      if (!groups[seriesKey]) {
        groups[seriesKey] = { seriesName: seriesKey, products: [], image: "" };
      }
      groups[seriesKey].products.push(product);
    });
    return Object.values(groups)
      .map((group) => ({
        ...group,
        image: getRepresentativeImage(group.products),
        products: group.products.sort((a, b) => {
          const order = ["Pro Max", "Pro", "Max", "Plus", "Ultra", ""];
          const aIdx = order.findIndex((t) => a.name.includes(t));
          const bIdx = order.findIndex((t) => b.name.includes(t));
          return aIdx - bIdx;
        }),
      }))
      .sort((a, b) => {
        const aNum = parseInt(a.seriesName.match(/\d+/)?.[0] || 0);
        const bNum = parseInt(b.seriesName.match(/\d+/)?.[0] || 0);
        return bNum - aNum;
      });
  };

  // ============================================
  // FETCH DATA & EFFECTS (Giữ nguyên)
  // ============================================
  const fetchCategoryData = useCallback(
    async (categoryName) => {
      if (categoryData[categoryName]) return;
      setLoading(true);
      try {
        const api = API_MAP[categoryName];
        if (!api) return;
        const response = await api.getAll({ limit: 100 });
        const products = response.data?.data?.products || response.data || [];
        const series = groupBySeries(products, categoryName);
        setCategoryData((prev) => ({
          ...prev,
          [categoryName]: { series, allProducts: products },
        }));
      } catch (error) {
        console.error(`Error loading ${categoryName}:`, error);
      } finally {
        setLoading(false);
      }
    },
    [categoryData]
  );

  // Auto load iPhone on open
  useEffect(() => {
    if (isOpen && !categoryData["iPhone"]) {
      fetchCategoryData("iPhone");
      setSelectedCategory(0);
    }
  }, [isOpen, fetchCategoryData, categoryData]);

  // Click outside (Giữ nguyên)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ============================================
  // HANDLERS (Giữ nguyên)
  // ============================================
  const handleCategoryClick = (name, idx) => {
    setSelectedCategory(idx);
    fetchCategoryData(name);
    // Trên Desktop, KHÔNG điều hướng ngay, chỉ hover
    // Trên Mobile, ta muốn điều hướng
    const isMobile = window.innerWidth < 768; // md breakpoint
    if (isMobile) {
      const param = CATEGORY_PARAM_MAP[name];
      navigate(`/products?category=${encodeURIComponent(param)}`);
      setIsOpen(false);
    }
  };

  // Hàm này dùng cho nút "Xem tất cả" hoặc click category
  const navigateToCategory = (name) => {
    const param = CATEGORY_PARAM_MAP[name];
    navigate(`/products?category=${encodeURIComponent(param)}`);
    setIsOpen(false); // Đóng dropdown
  };

  const handleModelClick = (model) => {
    const catParam = CATEGORY_PARAM_MAP[categories[selectedCategory]];
    navigate(
      `/products?category=${encodeURIComponent(
        catParam
      )}&model=${encodeURIComponent(model)}`
    );
    setIsOpen(false);
  };

  const currentData = categoryData[categories[selectedCategory]];

  // ============================================
  // RENDER (Đã cập nhật responsive)
  // ============================================
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onMouseEnter={() => setIsOpen(true)} // Tắt hover trên desktop để mobile dễ dùng
        //onMouseEnter={() => setIsOpen(!isOpen)}
        className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-sm font-medium"
      >
        <Menu className="w-5 h-5" />
        Danh mục
      </button>

      {/* ========================================== */}
      {/* THAY ĐỔI 2: Panel responsive */}
      {/* ========================================== */}
      {isOpen && (
        <div
          // Mobile: Toàn màn hình, bắt đầu từ top-20 (80px)
          className="fixed inset-0 top-20 z-50 bg-white/40 backdrop-blur-3xl border border-white/20 overflow-y-auto
                     md:inset-auto md:top-20 md:left-1/2 md:-translate-x-1/2 md:w-[1200px] md:h-[600px] md:rounded-3xl md:shadow-2xl md:overflow-hidden"
        >
          {/* Nút X đóng trên Mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-800 md:hidden"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col h-full md:flex-row">
            {/* === Left: Categories === */}
            <div
              // Mobile: w-full, p-2
              // Desktop: w-80, p-6
              className="w-full bg-gray-50 p-2 md:w-80 md:p-6 md:overflow-y-auto"
            >
              <div
                // Mobile: flex-row, cuộn ngang
                // Desktop: flex-col
                className="flex gap-2 overflow-x-auto md:flex-col md:space-y-1 md:overflow-x-hidden"
              >
                {categories.map((cat, idx) => {
                  const imgSrc = CATEGORY_IMAGES[cat];
                  const displayName = CATEGORY_DISPLAY_MAP[cat] || cat;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCategoryClick(cat, idx)}
                      onMouseEnter={() => {
                        setSelectedCategory(idx);
                        fetchCategoryData(cat);
                      }}
                      // Mobile: flex-col (icon trên, text dưới)
                      // Desktop: flex-row (icon trái, text phải)
                      className={`flex-shrink-0 w-20 p-2 flex flex-col items-center gap-1 rounded-xl 
                                  md:w-full md:flex-row md:items-center md:gap-3 md:px-4 md:py-3 md:text-left font-medium transition-all ${
                                    selectedCategory === idx
                                      ? "bg-white text-black shadow-sm"
                                      : "text-gray-600 hover:bg-gray-100"
                                  }`}
                    >
                      <img
                        src={imgSrc}
                        alt={displayName}
                        // Mobile: w-10 h-10
                        // Desktop: w-6 h-6
                        className="w-14 h-14 md:w-10 md:h-10 object-contain"
                      />
                      <span className="text-center text-xs md:text-left md:text-base">
                        {displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === Right: Content === */}
            <div
              // Mobile: p-4
              // Desktop: p-8
              className="flex-1 p-4 overflow-y-auto md:p-8"
            >
              {loading ? (
                // --- Loading State (Responsive) ---
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded mt-2 w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-xl p-4 h-32 animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              ) : currentData ? (
                // --- Content State (Responsive) ---
                <>
                  {/* Gợi ý */}
                  <div className="mb-6">
                    <h3 className="text-lg text-black font-bold flex items-center gap-2 mb-4 md:text-xl">
                      Gợi ý cho bạn
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                      {currentData.allProducts
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4)
                        .map((p, i) => (
                          <button
                            key={i}
                            onClick={() => handleModelClick(p.model || p.name)}
                            className="group text-center flex flex-col justify-start"
                          >
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg overflow-hidden mb-2 md:w-20 md:h-20">
                              <img
                                src={
                                  p.images?.[0] ||
                                  p.variants?.[0]?.images?.[0] ||
                                  ""
                                }
                                alt={p.name}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              />
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2 group-hover:text-black md:text-sm">
                              {p.name}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Series Grid */}
                  <h3 className="text-base text-black font-semibold mb-4 md:text-lg">
                    Chọn theo dòng {categories[selectedCategory]}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
                    {currentData.series.map((series, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleModelClick(series.seriesName)}
                        className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all text-left group md:p-4"
                      >
                        <div className="flex gap-3 items-start mb-3">
                          <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 md:w-16 md:h-16">
                            {series.image ? (
                              <img
                                src={series.image}
                                alt={series.seriesName}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-6 h-6 md:w-8 md:h-8" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 md:text-base">
                              {series.seriesName}
                            </h4>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 md:text-sm">
                          {series.products.slice(0, 3).map((p, i) => (
                            <p
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleModelClick(p.model || p.name);
                              }}
                              className="hover:text-black cursor-pointer pl-1"
                            >
                              {p.name}
                            </p>
                          ))}
                          {series.products.length > 3 && (
                            <p className="text-xs text-blue-600 pl-1">
                              +{series.products.length - 3} phiên bản khác
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Không có dữ liệu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;