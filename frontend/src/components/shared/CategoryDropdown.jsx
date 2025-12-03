// ============================================
// FILE: frontend/src/components/shared/CategoryDropdown.jsx
// UPDATED: Optimized mobile UI with white background
// ============================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Package, X, ChevronRight } from "lucide-react";

// API imports
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

import { useTopSellers } from "@/hooks/useTopSellers";

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

const CATEGORY_IMAGES = {
  iPhone: "/iphone_17_pro_bac.png",
  iPad: "/ipad_air_xanh.png",
  Mac: "/mac.png",
  AirPods: "/airpods.png",
  "Apple Watch": "/applewatch.png",
  "Phụ Kiện": "/op_ip_17_pro.png",
};

const CATEGORY_DISPLAY_MAP = {
  iPhone: "iPhone",
  iPad: "iPad",
  Mac: "Mac",
  AirPods: "AirPods",
  "Apple Watch": "Apple Watch",
  "Phụ Kiện": "Phụ Kiện",
};

const CATEGORY_TO_PATH = {
  iPhone: "/timkiem?",
  iPad: "/may-tinh-bang",
  Mac: "/macbook",
  AirPods: "/tai-nghe",
  "Apple Watch": "/apple-watch",
  "Phụ Kiện": "/phu-kien",
};

const CategoryDropdown = ({
  isMobileMenu = false,
  isOpen: controlledIsOpen,
  onClose = () => {},
}) => {
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { topSellers: displayBestSellers } = useTopSellers();

  // Use controlled state if provided (for mobile), otherwise use internal state (for desktop)
  const isOpen = isMobileMenu ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isMobileMenu ? () => {} : setInternalIsOpen;

  useEffect(() => {
    if (!isOpen) return;

    const loadedCategories = Object.values(categoryData).filter(
      (cat) => cat?.allProducts?.length > 0
    );

    if (loadedCategories.length >= 2) {
      const allProducts = loadedCategories
        .flatMap((cat) => cat.allProducts)
        .filter(Boolean);

      useTopSellers.getState().calculateTopSellers(allProducts);
    } else {
      useTopSellers.getState().calculateTopSellers([]);
    }
  }, [isOpen, categoryData]);

  const getSeriesKey = (productName = "", categoryName) => {
    if (!productName || !categoryName) return categoryName;

    const name = productName.trim();

    if (categoryName === "iPhone") {
      const match = name.match(/iPhone\s+(\d+[A-Za-z]*)/i);
      if (match) return `iPhone ${match[1]} Series`;
    }

    if (categoryName === "iPad") {
      if (/Pro/i.test(name)) {
        const size = name.match(/(11|12\.9|13)\s*[-–]?\s*inch/i);
        return size ? `iPad Pro ${size[1]}-inch` : "iPad Pro";
      }
      if (/Air/i.test(name)) return "iPad Air";
      if (/Mini/i.test(name)) return "iPad Mini";
      const gen = name.match(/iPad\s*\(?\s*(\d+[a-z]*)\s*\)?/i);
      if (gen) return `iPad (${gen[1]})`;
    }

    if (categoryName === "Mac") {
      if (/MacBook Pro/i.test(name)) {
        const size = name.match(/(13|14|16)\s*[-–]?\s*inch/i);
        return size ? `MacBook Pro ${size[1]}-inch` : "MacBook Pro";
      }
      if (/MacBook Air/i.test(name)) return "MacBook Air";
      if (/iMac/i.test(name)) return "iMac";
      if (/Mac Mini/i.test(name)) return "Mac Mini";
      if (/Mac Studio/i.test(name)) return "Mac Studio";
      if (/Mac Pro/i.test(name)) return "Mac Pro";
    }

    if (categoryName === "Apple Watch") {
      if (/Ultra/i.test(name)) return "Apple Watch Ultra";
      if (/SE/i.test(name)) return "Apple Watch SE";
      const series = name.match(/Series\s+(\d+)/i);
      if (series) return `Apple Watch Series ${series[1]}`;
    }

    if (categoryName === "AirPods") {
      if (/Pro\s+2|Pro\s*\(2nd/i.test(name))
        return "AirPods Pro (2nd generation)";
      if (/Pro/i.test(name)) return "AirPods Pro";
      if (/Max/i.test(name)) return "AirPods Max";
      const gen = name.match(/AirPods\s+(\d+[a-z]*)/i);
      if (gen) return `AirPods (${gen[1]} generation)`;
    }

    if (categoryName === "Phụ Kiện") {
      const lowerName = name.toLowerCase();

      if (
        lowerName.includes("ốp") ||
        lowerName.includes("case") ||
        lowerName.includes("bao da") ||
        lowerName.includes("ốp lưng")
      ) {
        return "Ốp lưng & Bao da";
      }

      if (
        lowerName.includes("kính") ||
        lowerName.includes("cường lực") ||
        lowerName.includes("dán") ||
        lowerName.includes("tempered") ||
        lowerName.includes("glass")
      ) {
        return "Kính cường lực & Miếng dán";
      }

      if (
        lowerName.includes("cáp") ||
        lowerName.includes("sạc") ||
        lowerName.includes("charger") ||
        lowerName.includes("cable") ||
        lowerName.includes("dây")
      ) {
        return "Cáp sạc & Bộ sạc";
      }

      if (
        lowerName.includes("pin") &&
        (lowerName.includes("dự phòng") ||
          lowerName.includes("sạc dự phòng") ||
          lowerName.includes("powerbank") ||
          lowerName.includes("power bank"))
      ) {
        return "Pin sạc dự phòng";
      }

      if (
        (lowerName.includes("tai nghe") ||
          lowerName.includes("headphone") ||
          lowerName.includes("earphone")) &&
        !lowerName.includes("airpods")
      ) {
        return "Tai nghe có dây & Bluetooth";
      }

      if (lowerName.includes("loa")) {
        return "Loa Bluetooth";
      }

      if (
        lowerName.includes("gậy") ||
        lowerName.includes("selfie") ||
        lowerName.includes("tripod") ||
        lowerName.includes("giá đỡ") ||
        lowerName.includes("đế")
      ) {
        return "Gậy selfie & Giá đỡ";
      }

      if (
        lowerName.includes("thẻ nhớ") ||
        lowerName.includes("usb") ||
        lowerName.includes("ổ cứng") ||
        lowerName.includes("ssd")
      ) {
        return "Thẻ nhớ & Lưu trữ";
      }

      if (lowerName.includes("pencil") || lowerName.includes("bút")) {
        return "Apple Pencil & Bút cảm ứng";
      }

      return "Phụ kiện khác";
    }

    return categoryName;
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

  useEffect(() => {
    if (!isOpen) return;

    if (!categoryData["iPhone"]?.allProducts) {
      fetchCategoryData("iPhone");
      setSelectedCategory(0);
    }

    if (!categoryData["Mac"]?.allProducts) {
      setTimeout(() => {
        fetchCategoryData("Mac");
      }, 0);
    }
  }, [isOpen, categoryData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        if (!isMobileMenu) {
          setInternalIsOpen(false);
        }
      }
    };
    if (isOpen && !isMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobileMenu]);

  const handleCategoryClick = (name, idx) => {
    setSelectedCategory(idx);
    fetchCategoryData(name);

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Mobile: không đóng menu, chỉ load data
      return;
    }
  };

  const navigateToCategory = (categoryName, seriesName) => {
    if (categoryName === "Phụ Kiện") {
      navigate("/phu-kien");
      setIsOpen(false);
      if (isMobileMenu) onClose();
      return;
    }

    let keyword = seriesName
      .replace(/Series/gi, "")
      .replace(/\(.*?\)/g, "")
      .replace(/inch/gi, "")
      .replace(/generation/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (categoryName === "iPhone") {
      const match = seriesName.match(/iPhone\s+(\d+[A-Za-z]*)/i);
      if (match) {
        keyword = `iphone ${match[1].toLowerCase()}`;
      }
    }

    const prettyMap = {
      "macbook pro": "macbook pro",
      "macbook air": "macbook air",
      "airpods pro": "airpods pro",
      "apple watch ultra": "apple watch ultra",
      "apple watch se": "apple watch se",
    };

    const lowerSeries = keyword.toLowerCase();
    for (const key in prettyMap) {
      if (lowerSeries.includes(key)) {
        keyword = prettyMap[key];
        break;
      }
    }

    navigate(`/tim-kiem?s=${encodeURIComponent(keyword)}`);
    setIsOpen(false);
    if (isMobileMenu) onClose();
  };

  const navigateToProductDetail = (product) => {
    const catParam = {
      iPhone: "dien-thoai",
      iPad: "may-tinh-bang",
      Mac: "macbook",
      AirPods: "tai-nghe",
      "Apple Watch": "apple-watch",
      "Phụ Kiện": "phu-kien",
    }[product.category || categories[selectedCategory]];

    const slug = product.slug || generateSlug(product.model || product.name);
    const variant =
      product.variants?.find((v) => v.stock > 0) || product.variants?.[0];
    const targetUrl = variant?.sku
      ? `/${catParam}/${slug}?sku=${variant.sku}`
      : `/${catParam}/${slug}`;

    setIsOpen(false);
    if (isMobileMenu) onClose();
    window.location.href = targetUrl;
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const currentData = categoryData[categories[selectedCategory]];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Desktop only (not shown in mobile menu mode) */}
      {!isMobileMenu && (
        <button
          onMouseEnter={() => setInternalIsOpen(true)}
          className="hidden md:flex bg-white text-black rounded-full px-6 py-3 items-center gap-2 transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-sm font-medium"
        >
          <Menu className="w-5 h-5" />
          Danh mục
        </button>
      )}

      {/* Panel - shown when triggered (desktop hover or mobile click) */}
      {isOpen && (
        <div
          className="fixed inset-0 top-20 z-50 bg-white overflow-y-auto
                     md:inset-auto md:top-20 md:left-1/2 md:-translate-x-1/2 md:w-[1200px] md:h-[600px] md:rounded-3xl md:shadow-2xl md:overflow-hidden md:bg-white/40 md:backdrop-blur-3xl md:border md:border-white/20"
        >
          {/* Close button - Mobile only */}
          <button
            onClick={() => {
              setIsOpen(false);
              if (isMobileMenu) onClose();
            }}
            className="absolute top-4 right-4 z-10 text-gray-700 hover:text-black md:hidden"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col h-full md:flex-row">
            {/* Left: Categories */}
            <div className="w-full bg-gray-50 p-2 md:w-80 md:p-6 md:overflow-y-auto">
              <div className="flex gap-2 overflow-x-auto md:flex-col md:space-y-1 md:overflow-x-hidden pb-2 md:pb-0">
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

            {/* Right: Content */}
            <div className="flex-1 p-4 overflow-y-auto md:p-8 bg-white md:bg-transparent">
              {loading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded mt-2 w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentData ? (
                <>
                  {/* Top Sellers */}
                  <div className="mb-6 md:mb-10">
                    <h3 className="text-base md:text-lg font-bold mb-4 md:mb-5 flex items-center gap-2 text-gray-900">
                      <span className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                        HOT
                      </span>
                      Sản phẩm bán chạy
                    </h3>

                    {displayBestSellers.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {displayBestSellers.map((product) => (
                          <button
                            key={product._id}
                            onClick={() => navigateToProductDetail(product)}
                            className="group relative text-center hover:-translate-y-2 transition-all duration-300"
                          >
                            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-white rounded-2xl overflow-hidden shadow-md mb-2 md:mb-3">
                              <img
                                src={
                                  product.images?.[0] ||
                                  product.variants?.[0]?.images?.[0] ||
                                  "/placeholder.png"
                                }
                                alt={product.name}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-xs md:text-sm font-medium line-clamp-2 text-gray-800 px-1 leading-tight">
                              {product.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="animate-pulse text-center">
                            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-gray-200 rounded-2xl mb-2 md:mb-3" />
                            <div className="h-3 md:h-4 bg-gray-200 rounded-full w-16 md:w-20 mx-auto" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Series Grid */}
                  <h3 className="text-sm md:text-base text-black font-semibold mb-3 md:mb-4 md:text-lg">
                    Chọn theo dòng {categories[selectedCategory]}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
                    {currentData.series.map((series, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          navigateToCategory(
                            categories[selectedCategory],
                            series.seriesName
                          )
                        }
                        className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all text-left group md:p-4"
                      >
                        <div className="flex gap-3 items-start mb-3">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
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
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-gray-900 md:text-base mb-1">
                              {series.seriesName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {series.products.length} phiên bản
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 md:text-sm">
                          {series.products.slice(0, 2).map((p, i) => (
                            <p
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToProductDetail(p);
                              }}
                              className="hover:text-black cursor-pointer pl-1 line-clamp-1"
                            >
                              • {p.name}
                            </p>
                          ))}
                          {series.products.length > 2 && (
                            <p className="text-xs text-blue-600 pl-1">
                              +{series.products.length - 2} sản phẩm khác
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

// Export helper to open mobile menu
export const useCategoryDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    openMenu: () => setIsOpen(true),
    closeMenu: () => setIsOpen(false),
  };
};
