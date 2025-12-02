import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { SlidersHorizontal, Package } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import ProductCard from "@/components/shared/ProductCard";
import ProductFilters from "@/components/shared/ProductFilters";

// ============================================
// API MAPPING
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
// FILTER OPTIONS
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

const DISPLAY_LABELS = {
  iPhone: "iPhone",
  iPad: "iPad",
  Mac: "MacBook",
  AirPods: "Tai nghe",
  AppleWatch: "Apple Watch",
  Accessories: "Phụ kiện",
};

const PATH_TO_CATEGORY = {
  "/dien-thoai": "iPhone",
  "/may-tinh-bang": "iPad",
  "/macbook": "Mac",
  "/tai-nghe": "AirPods",
  "/apple-watch": "AppleWatch",
  "/phu-kien": "Accessories",
};

// ============================================
// COMPONENT
// ============================================
const ProductsPage = ({ category: forcedCategory } = {}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ FIX: Lấy category từ URL query, bỏ qua forcedCategory nếu có ?category=
  const categoryFromQuery = searchParams.get("category");
  const categoryFromPath = PATH_TO_CATEGORY[location.pathname];

  // ✅ ƯU TIÊN: query > path > forcedCategory > default
  const category =
    categoryFromQuery || categoryFromPath || forcedCategory || "iPhone";

  const modelParam = searchParams.get("model") || "";
  const searchQuery = searchParams.get("search") || "";

  const api = API_MAP[category] || iPhoneAPI;
  const availableFilters = FILTER_OPTIONS[category] || {};

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const limit = 12;

  const [filters, setFilters] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
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

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      setPriceRange({
        min: minPrice || "",
        max: maxPrice || "",
      });
      setSelectedPricePreset(null);
    }
  }, [category, searchParams, availableFilters]);

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const hasActiveFilters =
        Object.keys(filters).some((key) => filters[key]?.length > 0) ||
        priceRange.min ||
        priceRange.max;

      const fetchLimit = hasActiveFilters ? 9999 : limit;
      const fetchPage = hasActiveFilters ? 1 : page;

      const params = {
        limit: fetchLimit,
        page: fetchPage,
        status: "AVAILABLE",
      };

      if (searchQuery) params.search = searchQuery;
      if (modelParam) params.model = modelParam;

      console.log("Fetching products with params:", params);

      const response = await api.getAll(params);
      const serverData = response.data?.data;

      if (!serverData) {
        throw new Error("Dữ liệu trả về không hợp lệ");
      }

      let fetchedProducts = serverData.products || [];
      const totalFromServer = serverData.total || fetchedProducts.length;

      // CLIENT-SIDE FILTERING
      if (hasActiveFilters) {
        const filteredProducts = fetchedProducts.filter((product) => {
          if (filters.storage?.length > 0) {
            const matchStorage = product.variants?.some((v) =>
              filters.storage.includes(v.storage)
            );
            if (!matchStorage) return false;
          }

          if (filters.ram?.length > 0) {
            const matchRam = product.variants?.some((v) =>
              filters.ram.includes(v.ram)
            );
            if (!matchRam) return false;
          }

          if (filters.connectivity?.length > 0) {
            const matchConnectivity = product.variants?.some((v) =>
              filters.connectivity.includes(v.connectivity)
            );
            if (!matchConnectivity) return false;
          }

          if (filters.condition?.length > 0) {
            if (!filters.condition.includes(product.condition)) return false;
          }

          if (priceRange.min || priceRange.max) {
            const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
            const maxPrice = priceRange.max
              ? parseFloat(priceRange.max)
              : Infinity;

            const hasPriceInRange = product.variants?.some((v) => {
              const price = v.price || 0;
              return price >= minPrice && price <= maxPrice;
            });

            if (!hasPriceInRange) return false;
          }

          return true;
        });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        setProducts(paginatedProducts);
        setTotal(filteredProducts.length);
      } else {
        setProducts(fetchedProducts);
        setTotal(totalFromServer);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách sản phẩm:", err);
      const message =
        err.response?.data?.message || err.message || "Không thể tải sản phẩm";
      setError(message);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, searchQuery, modelParam, filters, priceRange, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    params.set("category", category); // ✅ Giữ lại category hiện tại

    navigate(`?${params.toString()}`, { replace: true });
    setPage(1);
  };

  // ============================================
  // PRICE FILTER HANDLERS
  // ============================================
  const handlePriceChange = (newRange) => {
    setPriceRange(newRange);
    updateURLWithFilters(filters, newRange);
    setPage(1);
  };

  const updateURLWithFilters = (currentFilters, currentPriceRange) => {
    const params = new URLSearchParams(searchParams);

    Object.keys(currentFilters).forEach((key) => {
      if (currentFilters[key].length > 0) {
        params.set(key, currentFilters[key].join(","));
      } else {
        params.delete(key);
      }
    });

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

    // ✅ LUÔN LƯU CATEGORY VÀO URL
    params.set("category", category);
    params.set("page", "1");

    navigate(`?${params.toString()}`, { replace: true });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  // ============================================
  // ✅ HANDLER ĐỔI CATEGORY - XÓA TẤT CẢ FILTERS
  // ============================================
  const handleCategoryChange = (newCategory) => {
    if (newCategory === category) return; // Không làm gì nếu đã đang ở category này

    // Reset tất cả filters
    setFilters({});
    setPriceRange({ min: "", max: "" });
    setSelectedPricePreset(null);
    setPage(1);

    // Navigate với chỉ category, bỏ hết filters cũ
    navigate(`?category=${newCategory}`, { replace: true });
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
  const activeFiltersCount =
    Object.values(filters).reduce(
      (count, arr) => count + (arr?.length || 0),
      0
    ) + (priceRange.min || priceRange.max ? 1 : 0);

  const categoryLabel = DISPLAY_LABELS[category] || category;

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
            <p className="text-sm text-gray-600">Danh mục: {categoryLabel}</p>
          )}
        </div>

        <div className="flex gap-6">
          {/* ============================================ */}
          {/* SIDEBAR FILTERS */}
          {/* ============================================ */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onFilterChange={handleFilterToggle}
              priceRange={priceRange}
              onPriceChange={handlePriceChange}
              availableFilters={availableFilters}
              onClearFilters={clearFilters}
              activeFiltersCount={activeFiltersCount}
              currentCategory={category}
              hideCategory={false} // ✅ LUÔN HIỂN THỊ BỘ LỌC CATEGORY
              isCategoryPage={false} // ✅ KHÔNG BAO GIỜ TỰ ĐỘNG ẨN
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          {/* ============================================ */}
          {/* MAIN CONTENT */}
          {/* ============================================ */}
          <main className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Tìm thấy <span className="font-semibold">{total}</span> sản phẩm
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
