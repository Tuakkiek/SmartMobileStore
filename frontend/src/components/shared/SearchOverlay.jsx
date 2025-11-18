// ============================================
// FILE: frontend/src/components/shared/SearchOverlay.jsx
// ✅ UPDATED: Simplified UI & Fixed navigation
// ============================================

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

// ============================================
// CATEGORY CONFIG
// ============================================
const SEARCH_CATEGORIES = [
  {
    id: "iphone",
    name: "iPhone",
    api: iPhoneAPI,
    route: "dien-thoai",
    limit: 3,
  },
  {
    id: "ipad",
    name: "iPad",
    api: iPadAPI,
    route: "may-tinh-bang",
    limit: 2,
  },
  {
    id: "mac",
    name: "Mac",
    api: macAPI,
    route: "macbook",
    limit: 2,
  },
  {
    id: "airpods",
    name: "AirPods",
    api: airPodsAPI,
    route: "tai-nghe",
    limit: 1,
  },
  {
    id: "watch",
    name: "Apple Watch",
    api: appleWatchAPI,
    route: "apple-watch",
    limit: 1,
  },
  {
    id: "accessories",
    name: "Accessories",
    api: accessoryAPI,
    route: "phu-kien",
    limit: 1,
  },
];

// ============================================
// QUICK LINKS
// ============================================
const QUICK_LINKS = [
  { name: "Tìm cửa hàng", path: "/stores" },
  { name: "iPhone", path: "/dien-thoai" },
  { name: "iPad", path: "/may-tinh-bang" },
  { name: "Mac", path: "/macbook" },
  { name: "AirPods", path: "/tai-nghe" },
  { name: "Apple Watch", path: "/apple-watch" },
];

// ============================================
// SEARCH SERVICE
// ============================================
const searchProducts = async (query) => {
  if (!query?.trim()) return [];

  console.log("🔎 Searching for:", query);

  try {
    const searchPromises = SEARCH_CATEGORIES.map(async (category) => {
      try {
        console.log(`📡 Fetching from ${category.name}...`);
        const response = await category.api.getAll({
          search: query,
          limit: category.limit,
        });

        const products = response.data?.data?.products || [];
        console.log(`✅ ${category.name} returned ${products.length} products`);

        if (products.length > 0) {
          console.log(`📦 ${category.name} first product:`, {
            _id: products[0]._id,
            name: products[0].name,
            baseSlug: products[0].baseSlug,
            variantsCount: products[0].variants?.length,
            firstVariant: products[0].variants?.[0],
          });
        }

        return products.map((product) => ({
          ...product,
          _category: category.route,
          _categoryName: category.name,
        }));
      } catch (error) {
        console.warn(`❌ Search error for ${category.name}:`, error.message);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    const allResults = results.flat().slice(0, 8);

    console.log(`🎉 Total search results: ${allResults.length}`);
    console.log(
      "📋 All results:",
      allResults.map((p) => ({
        name: p.name,
        category: p._category,
        baseSlug: p.baseSlug,
        variantsCount: p.variants?.length,
      }))
    );

    return allResults;
  } catch (error) {
    console.error("❌ Search error:", error);
    return [];
  }
};

// ============================================
// SEARCH RESULT ITEM COMPONENT
// ============================================
const SearchResultItem = ({ product, category, onClose }) => {
  const navigate = useNavigate();

  console.log("📦 SearchResultItem - Product data:", {
    _id: product._id,
    name: product.name,
    model: product.model,
    baseSlug: product.baseSlug,
    slug: product.slug,
    category: product.category,
    routeCategory: category,
    variantsCount: product.variants?.length,
    variants: product.variants?.map((v) => ({
      _id: v._id,
      sku: v.sku,
      slug: v.slug,
      color: v.color,
      storage: v.storage,
      stock: v.stock,
    })),
  });

  // ✅ Lấy variant đầu tiên có stock > 0, nếu không có thì lấy variant đầu tiên
  const firstVariant =
    product.variants?.find((v) => v.stock > 0) || product.variants?.[0];

  console.log("🎯 Selected first variant:", {
    _id: firstVariant?._id,
    sku: firstVariant?.sku,
    slug: firstVariant?.slug,
    stock: firstVariant?.stock,
  });

  // ✅ Lấy ảnh đầu tiên từ variant
  const displayImage = firstVariant?.images?.[0] || product.images?.[0];

  // ✅ Lấy giá từ variant đầu tiên
  const displayPrice = firstVariant?.price || product.price || 0;

  // ✅ Tạo đường dẫn: /{category}/{variant.slug}?sku={variant.sku}
  const getProductPath = () => {
    if (firstVariant?.slug && firstVariant?.sku) {
      const path = `/${category}/${firstVariant.slug}?sku=${firstVariant.sku}`;
      console.log("✅ Generated path with variant:", path);
      return path;
    }

    // Fallback: dùng baseSlug
    const fallbackPath = `/${category}/${product.baseSlug || product.slug}`;
    console.log("⚠️ Fallback path (no variant):", fallbackPath);
    return fallbackPath;
  };

  const handleClick = () => {
    const path = getProductPath();
    console.log("🔍 Navigating to:", path);
    console.log("📍 Full navigation details:", {
      category,
      productBaseSlug: product.baseSlug,
      variantSlug: firstVariant?.slug,
      sku: firstVariant?.sku,
      finalPath: path,
    });
    navigate(path);
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-4 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-all text-left w-full group"
    >
      {/* Product Image */}
      <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Search className="w-6 h-6 text-gray-500" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        {/* Model Name */}
        <h4 className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
          {product.model}
        </h4>

        {/* Price */}
        <p className="text-blue-400 text-sm font-semibold mt-1">
          {new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(displayPrice)}
        </p>
      </div>

      {/* Arrow Icon */}
      <div className="text-gray-600 group-hover:text-blue-400 transition-colors">
        →
      </div>
    </button>
  );
};

// ============================================
// MAIN SEARCH OVERLAY COMPONENT
// ============================================
const SearchOverlay = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  // ============================================
  // SEARCH EFFECT - Debounced
  // ============================================
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim() && isOpen) {
        setIsSearching(true);
        try {
          const results = await searchProducts(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, isOpen]);

  // ============================================
  // AUTO FOCUS
  // ============================================
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ============================================
  // RESET ON CLOSE
  // ============================================
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Search Container */}
      <div
        className={`absolute top-0 left-0 right-0 bg-black shadow-2xl transform transition-all duration-500 ease-out ${
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="relative z-10">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Search Input */}
            <div className="relative mb-8">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900/50 text-gray-300 rounded-lg py-4 pl-12 pr-6 focus:outline-none focus:bg-gray-900 placeholder-gray-500 transition-colors"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Quick Links - Show when no search query */}
            {!searchQuery && (
              <div className="mb-8">
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                  Danh mục sản phẩm
                </h3>
                <div className="space-y-1">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors py-2.5 px-2 rounded-lg hover:bg-gray-900/30 group"
                    >
                      <span className="text-gray-600 group-hover:text-blue-500 transition-colors text-sm">
                        →
                      </span>
                      <span className="text-sm">{link.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div>
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                  {isSearching
                    ? "Đang tìm kiếm..."
                    : `Kết quả cho "${searchQuery}"`}
                </h3>

                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {/* ✅ THÊM NÚT NÀY */}
                    <div className="mb-4 flex justify-between items-center">
                      <p className="text-sm text-gray-400">
                        Tìm thấy {searchResults.length} sản phẩm
                      </p>
                      <button
                        onClick={() => {
                          navigate(
                            `/tim-kiem?s=${encodeURIComponent(searchQuery)}`
                          );
                          onClose();
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                      >
                        Xem tất cả kết quả
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {searchResults.map((product) => (
                        <SearchResultItem
                          key={product._id}
                          product={product}
                          category={product._category}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">
                      Không tìm thấy sản phẩm phù hợp với "{searchQuery}"
                    </p>
                    <p className="text-gray-600 text-xs mt-2">
                      Thử tìm kiếm với từ khóa khác
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
