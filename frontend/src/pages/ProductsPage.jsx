import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, Package } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import ProductCard from "@/components/shared/ProductCard";

// ============================================
// API MAPPING - Chuẩn hóa category với API
// ============================================
const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

// ============================================
// FILTER OPTIONS - Phù hợp với từng category
// ============================================
const FILTER_OPTIONS = {
  iPhone: {
    storage: ["64GB", "128GB", "256GB", "512GB", "1TB"],
    condition: ["NEW", "LIKE_NEW"],
  },
  iPad: {
    storage: ["64GB", "128GB", "256GB", "512GB", "1TB"],
    connectivity: ["WiFi", "5G"],
    condition: ["NEW", "LIKE_NEW"],
  },
  Mac: {
    storage: ["256GB", "512GB", "1TB", "2TB"],
    ram: ["8GB", "16GB", "24GB", "32GB", "64GB"],
    condition: ["NEW", "LIKE_NEW"],
  },
  AirPods: {
    condition: ["NEW", "LIKE_NEW"],
  },
  AppleWatch: {
    condition: ["NEW", "LIKE_NEW"],
  },
  Accessories: {
    condition: ["NEW", "LIKE_NEW"],
  },
};

const FILTER_LABELS = {
  storage: "Dung lượng",
  ram: "RAM",
  connectivity: "Kết nối",
  condition: "Tình trạng",
};

const CONDITION_LABELS = {
  NEW: "Mới 100%",
  LIKE_NEW: "Like New (99%)",
};

// ============================================
// PRICE RANGE PRESETS
// ============================================
const PRICE_RANGES = [
  { label: "Dưới 5 triệu", min: 0, max: 5000000 },
  { label: "5 - 10 triệu", min: 5000000, max: 10000000 },
  { label: "10 - 15 triệu", min: 10000000, max: 15000000 },
  { label: "15 - 20 triệu", min: 15000000, max: 20000000 },
  { label: "20 - 30 triệu", min: 20000000, max: 30000000 },
  { label: "Trên 30 triệu", min: 30000000, max: Infinity },
];

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const categoryParam = searchParams.get("category") || "iPhone";
  const modelParam = searchParams.get("model") || "";
  const searchQuery = searchParams.get("search") || "";

  const category = categoryParam;
  const api = API_MAP[category] || iPhoneAPI;
  const availableFilters = FILTER_OPTIONS[category] || {};

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const limit = 12;

  // Dynamic filters based on category
  const [filters, setFilters] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  
  // Price filter state
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [selectedPricePreset, setSelectedPricePreset] = useState(null);

  // ============================================
  // INITIALIZE FILTERS FROM URL
  // ============================================
  useEffect(() => {
    const newFilters = {};
    const newExpanded = {};

    Object.keys(availableFilters).forEach((key) => {
      const urlValue = searchParams.get(key);
      newFilters[key] = urlValue ? urlValue.split(",") : [];
      newExpanded[key] = true;
    });

    setFilters(newFilters);
    setExpandedSections(newExpanded);
    
    // Initialize price range from URL
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      setPriceRange({
        min: minPrice || "",
        max: maxPrice || "",
      });
      setSelectedPricePreset(null);
    }
  }, [category, searchParams]);

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        status: "AVAILABLE", // Chỉ lấy sản phẩm còn hàng
      };

      // Thêm search nếu có
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Thêm model filter nếu có
      if (modelParam) {
        params.model = modelParam;
      }

      console.log("📡 Fetching products:", { category, params });

      const response = await api.getAll(params);
      const data = response.data?.data;

      let fetchedProducts = data?.products || [];

      // ============================================
      // CLIENT-SIDE FILTERING (vì backend chưa hỗ trợ)
      // ============================================
      if (Object.keys(filters).some((key) => filters[key]?.length > 0) || 
          priceRange.min || priceRange.max) {
        fetchedProducts = fetchedProducts.filter((product) => {
          // Filter by storage
          if (filters.storage?.length > 0) {
            const hasMatchingStorage = product.variants?.some((variant) =>
              filters.storage.includes(variant.storage)
            );
            if (!hasMatchingStorage) return false;
          }

          // Filter by RAM (Mac only)
          if (filters.ram?.length > 0) {
            const hasMatchingRam = product.variants?.some((variant) =>
              filters.ram.includes(variant.ram)
            );
            if (!hasMatchingRam) return false;
          }

          // Filter by connectivity (iPad only)
          if (filters.connectivity?.length > 0) {
            const hasMatchingConnectivity = product.variants?.some((variant) =>
              filters.connectivity.includes(variant.connectivity)
            );
            if (!hasMatchingConnectivity) return false;
          }

          // Filter by condition
          if (filters.condition?.length > 0) {
            if (!filters.condition.includes(product.condition)) return false;
          }

          // Filter by price range
          if (priceRange.min || priceRange.max) {
            const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
            const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
            
            // Check if any variant falls within price range
            const hasMatchingPrice = product.variants?.some((variant) => {
              const variantPrice = variant.price || 0;
              return variantPrice >= minPrice && variantPrice <= maxPrice;
            });
            
            if (!hasMatchingPrice) return false;
          }

          return true;
        });
      }

      setProducts(fetchedProducts);
      setTotal(fetchedProducts.length);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError(err.response?.data?.message || "Không thể tải sản phẩm");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, category, modelParam, searchQuery, filters, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Scroll to top on category/page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [category, modelParam, page]);

  // ============================================
  // FILTER HANDLERS
  // ============================================
  const handleFilterToggle = (type, value) => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [type]: prev[type]?.includes(value)
          ? prev[type].filter((v) => v !== value)
          : [...(prev[type] || []), value],
      };

      updateURLWithFilters(newFilters, priceRange);
      return newFilters;
    });
    setPage(1);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clearFilters = () => {
    const emptyFilters = {};
    Object.keys(availableFilters).forEach((key) => {
      emptyFilters[key] = [];
    });
    setFilters(emptyFilters);
    setPriceRange({ min: "", max: "" });
    setSelectedPricePreset(null);

    const params = new URLSearchParams(searchParams);
    Object.keys(availableFilters).forEach((key) => params.delete(key));
    params.delete("minPrice");
    params.delete("maxPrice");
    params.set("page", "1");
    navigate(`?${params.toString()}`, { replace: true });

    setPage(1);
  };

  // ============================================
  // PRICE FILTER HANDLERS
  // ============================================
  const handlePricePresetClick = (preset) => {
    setSelectedPricePreset(preset.label);
    const newPriceRange = {
      min: preset.min === 0 ? "" : preset.min.toString(),
      max: preset.max === Infinity ? "" : preset.max.toString(),
    };
    setPriceRange(newPriceRange);
    updateURLWithFilters(filters, newPriceRange);
    setPage(1);
  };

  const handleCustomPriceChange = (field, value) => {
    setSelectedPricePreset(null);
    const newPriceRange = { ...priceRange, [field]: value };
    setPriceRange(newPriceRange);
  };

  const applyCustomPrice = () => {
    updateURLWithFilters(filters, priceRange);
    setPage(1);
  };

  const updateURLWithFilters = (currentFilters, currentPriceRange) => {
    const params = new URLSearchParams(searchParams);
    
    // Update filter params
    Object.keys(currentFilters).forEach((key) => {
      if (currentFilters[key].length > 0) {
        params.set(key, currentFilters[key].join(","));
      } else {
        params.delete(key);
      }
    });
    
    // Update price params
    if (currentPriceRange.min) {
      params.set("minPrice", currentPriceRange.min);
    } else {
      params.delete("minPrice");
    }
    
    if (currentPriceRange.max) {
      params.set("maxPrice", currentPriceRange.max);
    } else {
      params.delete("maxPrice");
    }
    
    params.set("page", "1");
    navigate(`?${params.toString()}`, { replace: true });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    navigate(`?${params.toString()}`, { replace: true });
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const activeFiltersCount = Object.values(filters).reduce(
    (count, arr) => count + (arr?.length || 0),
    0
  ) + (priceRange.min || priceRange.max ? 1 : 0);

  const categoryLabel = {
    iPhone: "iPhone",
    iPad: "iPad",
    Mac: "Mac",
    AirPods: "AirPods",
    AppleWatch: "Apple Watch",
    Accessories: "Phụ kiện",
  }[category];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery
              ? `Kết quả tìm kiếm: "${searchQuery}"`
              : modelParam
              ? `${categoryLabel} ${modelParam}`
              : categoryLabel}
          </h1>
          {searchQuery && (
            <p className="text-sm text-gray-600">
              Danh mục: {categoryLabel}
            </p>
          )}
        </div>

        <div className="flex gap-6">
          {/* ============================================ */}
          {/* SIDEBAR FILTERS */}
          {/* ============================================ */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Bộ lọc
                </h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Xóa ({activeFiltersCount})
                  </button>
                )}
              </div>

              {Object.entries(availableFilters).map(([key, options]) => (
                <div key={key} className="mb-4">
                  <button
                    onClick={() => toggleSection(key)}
                    className="flex items-center justify-between w-full mb-3"
                  >
                    <span className="font-medium text-sm">
                      {FILTER_LABELS[key] || key}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedSections[key] ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedSections[key] && (
                    <div className="space-y-2 pl-1">
                      {options.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filters[key]?.includes(opt) || false}
                            onChange={() => handleFilterToggle(key, opt)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {key === "condition"
                              ? CONDITION_LABELS[opt] || opt
                              : opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="border-t mt-4"></div>
                </div>
              ))}

              {/* ============================================ */}
              {/* PRICE FILTER SECTION */}
              {/* ============================================ */}
              <div className="mb-4">
                <button
                  onClick={() => toggleSection("price")}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <span className="font-medium text-sm">Khoảng giá</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedSections.price ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSections.price !== false && (
                  <div className="space-y-3 pl-1">
                    {/* Price presets */}
                    <div className="space-y-2">
                      {PRICE_RANGES.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => handlePricePresetClick(preset)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedPricePreset === preset.label
                              ? "bg-blue-100 text-blue-700 font-medium"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom price input */}
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">
                        Hoặc nhập khoảng giá (VNĐ)
                      </p>
                      <div className="space-y-2">
                        <input
                          type="number"
                          placeholder="Giá từ"
                          value={priceRange.min}
                          onChange={(e) =>
                            handleCustomPriceChange("min", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Giá đến"
                          value={priceRange.max}
                          onChange={(e) =>
                            handleCustomPriceChange("max", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={applyCustomPrice}
                          disabled={!priceRange.min && !priceRange.max}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Áp dụng
                        </button>
                      </div>
                      
                      {/* Current price range display */}
                      {(priceRange.min || priceRange.max) && (
                        <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                          {priceRange.min && priceRange.max
                            ? `${formatPrice(priceRange.min)} - ${formatPrice(
                                priceRange.max
                              )} VNĐ`
                            : priceRange.min
                            ? `Từ ${formatPrice(priceRange.min)} VNĐ`
                            : `Đến ${formatPrice(priceRange.max)} VNĐ`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ============================================ */}
          {/* MAIN CONTENT */}
          {/* ============================================ */}
          <main className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Tìm thấy <span className="font-semibold">{total}</span> sản
                phẩm
              </p>
              <button className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc
                {activeFiltersCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl shadow-sm p-4 animate-pulse"
                  >
                    <div className="aspect-[3/4] bg-gray-200 rounded-xl mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <p className="text-lg font-semibold">Đã xảy ra lỗi</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={fetchProducts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Products grid */}
            {!loading && !error && products.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    isTopSeller={product.salesCount > 100}
                    isTopNew={
                      new Date() - new Date(product.createdAt) <
                      7 * 24 * 60 * 60 * 1000
                    }
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold mb-2">
                  Không tìm thấy sản phẩm
                </p>
                <p className="text-sm">
                  Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>

                <div className="flex gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && (
                    <>
                      <span className="px-2 py-2">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          page === totalPages
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, page + 1))
                  }
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;