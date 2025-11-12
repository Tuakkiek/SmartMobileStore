// frontend/src/components/shared/CategoryDropdown.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Package, Smartphone, Tablet, Laptop, Headphones, Watch } from "lucide-react";

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

const categories = ["iPhone", "iPad", "Mac", "AirPods", "Apple Watch", "Phụ Kiện"];

const ICONS = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Laptop,
  AirPods: Headphones,
  "Apple Watch": Watch,
  "Phụ Kiện": Package,
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
  // EXTRACT SERIES & GET REPRESENTATIVE IMAGE
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
      if (name.includes("Pro")) return `iPad Pro ${match[1].replace(/[^\d.]/g, "")}-inch`;
      if (name.includes("Air")) return `iPad Air (${match[1].replace(/[^\d]/g, "")})`;
      return `iPad (${match[1].replace(/[^\d]/g, "")})`;
    }
    if (category === "Mac") {
      if (name.includes("MacBook Pro")) return `MacBook Pro ${name.match(/14|16/)?.[0]}-inch (2023)`;
      if (name.includes("MacBook Air")) return "MacBook Air (2023)";
      if (name.includes("iMac")) return "iMac 24-inch (2023)";
    }
    if (category === "Apple Watch") {
      if (name.includes("Ultra")) return "Apple Watch Ultra";
      if (name.includes("SE")) return "Apple Watch SE (2nd)";
      return `Apple Watch Series ${match[1].match(/\d+/)?.[0]}`;
    }
    if (category === "AirPods") {
      if (name.includes("Pro") && name.includes("2nd")) return "AirPods Pro (2nd)";
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
    return products[0]?.images?.[0] || products[0]?.variants?.[0]?.images?.[0] || "";
  };

  const groupBySeries = (products, categoryName) => {
    const groups = {};

    products.forEach((product) => {
      const seriesKey = getSeriesKey(product.name || product.model, categoryName);
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
  // FETCH DATA
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

  // Click outside
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
  // HANDLERS
  // ============================================
  const handleCategoryClick = (name, idx) => {
    setSelectedCategory(idx);
    fetchCategoryData(name);

    // CHUYỂN HƯỚNG NGAY LẬP TỨC đến trang danh mục
    const param = CATEGORY_PARAM_MAP[name];
    navigate(`/products?category=${encodeURIComponent(param)}`);
    setIsOpen(false); // Đóng dropdown
  };

  const handleModelClick = (model) => {
    const catParam = CATEGORY_PARAM_MAP[categories[selectedCategory]];
    navigate(`/products?category=${encodeURIComponent(catParam)}&model=${encodeURIComponent(model)}`);
    setIsOpen(false);
  };

  const currentData = categoryData[categories[selectedCategory]];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-sm font-medium"
      >
        <Menu className="w-5 h-5" />
        Danh mục
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden z-50 hidden md:block"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex h-full">
            {/* Left: Categories */}
            <div className="w-80 bg-gray-50 p-6">
              <div className="space-y-1">
                {categories.map((cat, idx) => {
                  const Icon = ICONS[cat];
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCategoryClick(cat, idx)}
                      onMouseEnter={() => {
                        setSelectedCategory(idx);
                        fetchCategoryData(cat);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${
                        selectedCategory === idx
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Content */}
            <div className="flex-1 p-8 overflow-y-auto">
              {loading ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded mt-2 w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 h-32 animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ) : currentData ? (
                <>
                  {/* Gợi ý */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                      Gợi ý cho bạn
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {currentData.allProducts
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4)
                        .map((p, i) => (
                          <button
                            key={i}
                            onClick={() => handleModelClick(p.model || p.name)}
                            className="group text-center"
                          >
                            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-lg overflow-hidden mb-2">
                              <img
                                src={p.images?.[0] || p.variants?.[0]?.images?.[0] || ""}
                                alt={p.name}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              />
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-black">
                              {p.name}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Series Grid */}
                  <h3 className="text-lg font-semibold mb-4">
                    Chọn theo dòng {categories[selectedCategory]}
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    {currentData.series.map((series, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleModelClick(series.seriesName)}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex gap-3 items-start mb-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {series.image ? (
                              <img
                                src={series.image}
                                alt={series.seriesName}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-gray-900">
                              {series.seriesName}
                            </h4>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
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