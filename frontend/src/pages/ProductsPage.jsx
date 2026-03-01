import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, Package, ArrowUpDown } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
  universalProductAPI,
} from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X } from "lucide-react"; // thêm icon đóng
import ProductCard from "@/components/shared/ProductCard";
import ProductFilters from "@/components/shared/ProductFilters";
import { Button } from "@/components/ui/button";

// ============================================
// API MAPPING
// ============================================
const LEGACY_API_MAP = {
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
const LEGACY_FILTER_OPTIONS = {
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

const UNIVERSAL_FILTER_OPTIONS = {
  storage: ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
  condition: ["NEW", "LIKE_NEW"],
};

const LEGACY_DISPLAY_LABELS = {
  iPhone: "iPhone",
  iPad: "iPad",
  Mac: "MacBook",
  AirPods: "Tai nghe",
  AppleWatch: "Apple Watch",
  Accessories: "Phụ kiện",
};

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Bán chạy" },
];

const getVariantFieldValue = (variant, field) => {
  if (!variant) return "";

  const directValue = variant[field];
  if (directValue !== undefined && directValue !== null && directValue !== "") {
    return String(directValue).trim();
  }

  const attributeValue = variant?.attributes?.[field];
  if (
    attributeValue !== undefined &&
    attributeValue !== null &&
    attributeValue !== ""
  ) {
    return String(attributeValue).trim();
  }

  if (field === "storage") {
    const fromName = String(variant?.variantName || "").match(/(\d+(?:GB|TB))/i);
    if (fromName) return fromName[1].toUpperCase();
  }

  return "";
};

const getProductMinPrice = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return Number(product?.price || 0);

  const prices = variants
    .map((variant) => Number(variant?.price || 0))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) return Number(product?.price || 0);
  return Math.min(...prices);
};

// ============================================
// COMPONENT
// ============================================
const ProductsPage = ({ category: forcedCategory } = {}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const productTypeFromQuery = searchParams.get("productType") || "";
  const productTypeNameFromQuery = searchParams.get("productTypeName") || "";
  const isUniversalMode = Boolean(productTypeFromQuery);

  // Legacy category from URL query
  const categoryFromQuery = searchParams.get("category");
  const category = categoryFromQuery || forcedCategory || "iPhone";

  const modelParam = searchParams.get("model") || "";
  const searchQuery = searchParams.get("search") || "";
  const sortParam = searchParams.get("sort") || "default";

  const api = isUniversalMode
    ? universalProductAPI
    : LEGACY_API_MAP[category] || iPhoneAPI;
  const availableFilters = useMemo(
    () =>
      isUniversalMode
        ? UNIVERSAL_FILTER_OPTIONS
        : LEGACY_FILTER_OPTIONS[category] || {},
    [isUniversalMode, category]
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const limit = 12;

  const [filters, setFilters] = useState({});
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState(sortParam);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // ============================================
  // INITIALIZE FILTERS FROM URL
  // ============================================
  useEffect(() => {
    const newFilters = {};

    Object.keys(availableFilters).forEach((key) => {
      const urlValue = searchParams.get(key);
      newFilters[key] = urlValue ? urlValue.split(",") : [];
    });

    setFilters(newFilters);

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      setPriceRange({
        min: minPrice || "",
        max: maxPrice || "",
      });
    }

    // Sync sort from URL
    const urlSort = searchParams.get("sort") || "default";
    setSortBy(urlSort);
  }, [category, searchParams, availableFilters, isUniversalMode, productTypeFromQuery]);

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

      // Luôn fetch tất cả để filter client-side
      const params = {
        limit: 9999,
        page: 1,
        status: "AVAILABLE",
      };

      if (isUniversalMode) {
        params.productType = productTypeFromQuery;
      }
      if (searchQuery) params.search = searchQuery;
      if (modelParam) params.model = modelParam;

      const response = await api.getAll(params);
      const serverData = response.data?.data;

      if (!serverData) {
        throw new Error("Dữ liệu trả về không hợp lệ");
      }

      let fetchedProducts = serverData.products || [];

      // CLIENT-SIDE FILTERING
      if (hasActiveFilters) {
        fetchedProducts = fetchedProducts.filter((product) => {
          // Filter by storage
          if (filters.storage?.length > 0) {
            const matchStorage = product.variants?.some((variant) =>
              filters.storage.includes(getVariantFieldValue(variant, "storage"))
            );
            if (!matchStorage) return false;
          }

          // Filter by RAM
          if (filters.ram?.length > 0) {
            const matchRam = product.variants?.some((variant) =>
              filters.ram.includes(getVariantFieldValue(variant, "ram"))
            );
            if (!matchRam) return false;
          }

          // Filter by connectivity
          if (filters.connectivity?.length > 0) {
            const matchConnectivity = product.variants?.some((variant) =>
              filters.connectivity.includes(
                getVariantFieldValue(variant, "connectivity")
              )
            );
            if (!matchConnectivity) return false;
          }

          // Filter by condition
          if (filters.condition?.length > 0) {
            if (!filters.condition.includes(product.condition)) return false;
          }

          // Filter by price range
          if (priceRange.min || priceRange.max) {
            const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
            const maxPrice = priceRange.max
              ? parseFloat(priceRange.max)
              : Infinity;

            const hasPriceInRange = product.variants?.some((variant) => {
              const price = variant?.price || 0;
              return price >= minPrice && price <= maxPrice;
            });

            if (!hasPriceInRange) return false;
          }

          return true;
        });
      }

      // SORTING
      fetchedProducts = sortProducts(fetchedProducts, sortBy);

      // PAGINATION
      const totalFiltered = fetchedProducts.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = fetchedProducts.slice(startIndex, endIndex);

      setProducts(paginatedProducts);
      setTotal(totalFiltered);
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
  }, [
    api,
    searchQuery,
    modelParam,
    filters,
    priceRange,
    page,
    limit,
    sortBy,
    isUniversalMode,
    productTypeFromQuery,
  ]);

  // ============================================
  // SORT PRODUCTS
  // ============================================
  const sortProducts = (products, sortType) => {
    const sorted = [...products];

    switch (sortType) {
      case "price_asc":
        return sorted.sort(
          (a, b) => getProductMinPrice(a) - getProductMinPrice(b)
        );

      case "price_desc":
        return sorted.sort(
          (a, b) => getProductMinPrice(b) - getProductMinPrice(a)
        );

      case "newest":
        return sorted.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

      case "popular":
        return sorted.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));

      default:
        return sorted;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [category, productTypeFromQuery, modelParam, page]);

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

      updateURLWithFilters(newFilters, priceRange, sortBy);
      return newFilters;
    });
    setPage(1);
  };

  const applyBaseCategoryParams = (params) => {
    if (isUniversalMode) {
      params.set("productType", productTypeFromQuery);
      if (productTypeNameFromQuery) {
        params.set("productTypeName", productTypeNameFromQuery);
      }
    } else {
      params.set("category", category);
    }
  };

  const clearFilters = () => {
    const emptyFilters = {};
    Object.keys(availableFilters).forEach((key) => {
      emptyFilters[key] = [];
    });
    setFilters(emptyFilters);
    setPriceRange({ min: "", max: "" });
    setSortBy("default");

    const params = new URLSearchParams();
    applyBaseCategoryParams(params);
    params.set("page", "1");
    navigate(`/products?${params.toString()}`, { replace: true });
    setPage(1);
  };

  // ============================================
  // PRICE FILTER HANDLERS
  // ============================================
  const handlePriceChange = (newRange) => {
    setPriceRange(newRange);
    updateURLWithFilters(filters, newRange, sortBy);
    setPage(1);
  };

  // ============================================
  // SORT HANDLER
  // ============================================
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    updateURLWithFilters(filters, priceRange, newSort);
    setPage(1);
  };

  // ============================================
  // UPDATE URL WITH ALL PARAMS
  // ============================================
  const updateURLWithFilters = (
    currentFilters,
    currentPriceRange,
    currentSort
  ) => {
    const params = new URLSearchParams();

    // Base category params (required)
    applyBaseCategoryParams(params);

    if (modelParam) params.set("model", modelParam);
    if (searchQuery) params.set("search", searchQuery);

    // Filters
    Object.keys(currentFilters).forEach((key) => {
      if (currentFilters[key]?.length > 0) {
        params.set(key, currentFilters[key].join(","));
      }
    });

    // Price range
    if (currentPriceRange.min) {
      params.set("minPrice", currentPriceRange.min);
    }
    if (currentPriceRange.max) {
      params.set("maxPrice", currentPriceRange.max);
    }

    // Sort
    if (currentSort && currentSort !== "default") {
      params.set("sort", currentSort);
    }

    // Page
    params.set("page", "1");

    navigate(`/products?${params.toString()}`, { replace: true });
  };

  // ============================================
  // CATEGORY CHANGE HANDLER
  // ============================================
  const handleCategoryChange = (newCategory) => {
    if (isUniversalMode) return;
    if (newCategory === category) return;

    // Reset everything
    setFilters({});
    setPriceRange({ min: "", max: "" });
    setSortBy("default");
    setPage(1);

    navigate(`/products?category=${newCategory}`, { replace: true });
  };

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    navigate(`/products?${params.toString()}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const activeFiltersCount =
    Object.values(filters).reduce(
      (count, arr) => count + (arr?.length || 0),
      0
    ) + (priceRange.min || priceRange.max ? 1 : 0);

  const categoryLabel = isUniversalMode
    ? productTypeNameFromQuery ||
      products?.[0]?.productType?.name ||
      "Sản phẩm"
    : LEGACY_DISPLAY_LABELS[category] || category;

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
              currentCategory={isUniversalMode ? "" : category}
              hideCategory={isUniversalMode}
              isCategoryPage={isUniversalMode}
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          {/* ============================================ */}
          {/* MAIN CONTENT */}
          {/* ============================================ */}
          <main className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
              <p className="text-sm text-gray-600">
                Tìm thấy <span className="font-semibold">{total}</span> sản phẩm
                {page > 1 && ` - Trang ${page}/${totalPages}`}
              </p>

              {/* Sort dropdown */}
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Mobile Filter Drawer */}
                <Sheet
                  open={mobileFiltersOpen}
                  onOpenChange={setMobileFiltersOpen}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden flex items-center gap-2 h-10"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Bộ lọc
                      {activeFiltersCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>

                  <SheetContent
                    side="left"
                    className="w-[90vw] sm:w-[400px] p-0 overflow-y-auto"
                  >
                    {/* Header cố định */}
                    <SheetHeader className="sticky top-0 bg-white border-b z-10 p-6 pb-4">
                      <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl font-bold">
                          Bộ lọc sản phẩm
                        </SheetTitle>
                        <button
                          onClick={() => setMobileFiltersOpen(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </SheetHeader>

                    {/* Nội dung bộ lọc */}
                    <div className="p-6 pt-2 pb-32">
                      <ProductFilters
                        filters={filters}
                        onFilterChange={(type, value) => {
                          handleFilterToggle(type, value);
                        }}
                        priceRange={priceRange}
                        onPriceChange={(newRange) => {
                          handlePriceChange(newRange);
                          
                        }}
                        availableFilters={availableFilters}
                        onClearFilters={() => {
                          clearFilters();
                          
                        }}
                        activeFiltersCount={activeFiltersCount}
                        currentCategory={isUniversalMode ? "" : category}
                        onCategoryChange={(newCat) => {
                          handleCategoryChange(newCat);
                          
                        }}
                        hideCategory={isUniversalMode}
                        isCategoryPage={isUniversalMode}
                      />
                    </div>

                    {/* Nút cố định dưới cùng */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                      <Button
                        size="lg"
                        className="w-full h-12 text-lg font-semibold"
                        onClick={() => setMobileFiltersOpen(false)}
                      >
                        Xem {total.toLocaleString("vi-VN")} sản phẩm
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
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

            {/* Pagination - UI đẹp, hiện đại, tối đa 7 số + ... + trang cuối */}
            {!loading && totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
                {/* Nút Trước */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                >
                  Trước
                </Button>

                {/* Trang 1 */}
                <Button
                  variant={page === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>

                {/* Dấu ... khi current page > 4 */}
                {page > 4 && totalPages > 7 && (
                  <span className="px-3 py-2 text-gray-500 font-medium">
                    ...
                  </span>
                )}

                {/* Các trang xung quanh current page (trừ trang 1 và trang cuối) */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p !== 1 &&
                      p !== totalPages &&
                      p >= page - 2 &&
                      p <= page + 2
                  )
                  .map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}

                {/* Dấu ... trước trang cuối */}
                {page < totalPages - 3 && totalPages > 7 && (
                  <span className="px-3 py-2 text-gray-500 font-medium">
                    ...
                  </span>
                )}

                {/* Trang cuối (chỉ hiển thị nếu > 1) */}
                {totalPages > 1 && (
                  <Button
                    variant={page === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                )}

                {/* Nút Sau */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, page + 1))
                  }
                >
                  Sau
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
