import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, SlidersHorizontal, X } from "lucide-react";
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
import ProductCard from "@/components/shared/ProductCard";
import ProductFilters from "@/components/shared/ProductFilters";
import { Button } from "@/components/ui/button";
import {
  createEmptyFilters,
  PRODUCT_FILTER_KEYS,
  sortProductsByOption,
  toggleFilterValue,
  useProductFilters,
} from "@/hooks/useProductFilters";

const LEGACY_API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

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
  Accessories: "Phu kien",
};

const SORT_OPTIONS = [
  { value: "default", label: "Mac dinh" },
  { value: "price_asc", label: "Gia tang dan" },
  { value: "price_desc", label: "Gia giam dan" },
  { value: "newest", label: "Moi nhat" },
  { value: "popular", label: "Ban chay" },
];

const ITEMS_PER_PAGE = 12;

const parseFilterValues = (rawValue) =>
  String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const ProductsPage = ({ category: forcedCategory } = {}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const productTypeFromQuery = searchParams.get("productType") || "";
  const productTypeNameFromQuery = searchParams.get("productTypeName") || "";
  const isUniversalMode = Boolean(productTypeFromQuery);

  const categoryFromQuery = searchParams.get("category");
  const category = categoryFromQuery || forcedCategory || "iPhone";
  const modelParam = searchParams.get("model") || "";
  const searchQuery = searchParams.get("search") || "";

  const api = isUniversalMode
    ? universalProductAPI
    : LEGACY_API_MAP[category] || iPhoneAPI;
  const fallbackFilters = useMemo(
    () =>
      isUniversalMode
        ? UNIVERSAL_FILTER_OPTIONS
        : LEGACY_FILTER_OPTIONS[category] || {},
    [isUniversalMode, category],
  );

  const [allProducts, setAllProducts] = useState([]);
  const [filters, setFilters] = useState({});
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default");
  const [page, setPage] = useState(
    Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const parsedFilters = {};
    const filterKeys = new Set([
      ...PRODUCT_FILTER_KEYS,
      ...Object.keys(fallbackFilters || {}),
    ]);

    filterKeys.forEach((key) => {
      parsedFilters[key] = parseFilterValues(searchParams.get(key));
    });

    setFilters(parsedFilters);
    setPriceRange({
      min: searchParams.get("minPrice") || "",
      max: searchParams.get("maxPrice") || "",
    });
    setSortBy(searchParams.get("sort") || "default");
    setPage(
      Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1),
    );
  }, [searchParams, fallbackFilters]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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
      const products = response?.data?.data?.products;

      if (!Array.isArray(products)) {
        throw new Error("Du lieu tra ve khong hop le");
      }

      setAllProducts(products);
    } catch (fetchError) {
      console.error("ProductsPage: failed to load products", fetchError);
      const message =
        fetchError?.response?.data?.message ||
        fetchError?.message ||
        "Khong the tai san pham";
      setError(message);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [api, isUniversalMode, productTypeFromQuery, searchQuery, modelParam]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const { filteredProducts, effectiveFilters, activeFiltersCount } =
    useProductFilters({
      products: allProducts,
      filters,
      priceRange,
      fallbackFilters,
    });

  const sortedProducts = useMemo(
    () => sortProductsByOption(filteredProducts, sortBy),
    [filteredProducts, sortBy],
  );

  const total = sortedProducts.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const products = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, page]);

  useEffect(() => {
    if (page > 1 && totalPages > 0 && page > totalPages) {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(totalPages));
      navigate(`/products?${params.toString()}`, { replace: true });
      setPage(totalPages);
    }
  }, [page, totalPages, searchParams, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [category, productTypeFromQuery, modelParam, page]);

  const applyBaseCategoryParams = useCallback(
    (params) => {
      if (isUniversalMode) {
        params.set("productType", productTypeFromQuery);
        if (productTypeNameFromQuery) {
          params.set("productTypeName", productTypeNameFromQuery);
        }
      } else {
        params.set("category", category);
      }
    },
    [isUniversalMode, productTypeFromQuery, productTypeNameFromQuery, category],
  );

  const updateURLWithFilters = useCallback(
    (currentFilters, currentPriceRange, currentSort) => {
      const params = new URLSearchParams();
      applyBaseCategoryParams(params);

      if (modelParam) params.set("model", modelParam);
      if (searchQuery) params.set("search", searchQuery);

      Object.entries(currentFilters || {}).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          params.set(key, values.join(","));
        }
      });

      if (currentPriceRange?.min) params.set("minPrice", currentPriceRange.min);
      if (currentPriceRange?.max) params.set("maxPrice", currentPriceRange.max);
      if (currentSort && currentSort !== "default") params.set("sort", currentSort);

      params.set("page", "1");
      navigate(`/products?${params.toString()}`, { replace: true });
    },
    [applyBaseCategoryParams, modelParam, searchQuery, navigate],
  );

  const handleFilterToggle = useCallback(
    (type, value) => {
      setFilters((prev) => {
        const next = toggleFilterValue(prev, type, value);
        updateURLWithFilters(next, priceRange, sortBy);
        return next;
      });
      setPage(1);
    },
    [priceRange, sortBy, updateURLWithFilters],
  );

  const handlePriceChange = useCallback(
    (nextRange) => {
      setPriceRange(nextRange);
      updateURLWithFilters(filters, nextRange, sortBy);
      setPage(1);
    },
    [filters, sortBy, updateURLWithFilters],
  );

  const handleSortChange = useCallback(
    (nextSort) => {
      setSortBy(nextSort);
      updateURLWithFilters(filters, priceRange, nextSort);
      setPage(1);
    },
    [filters, priceRange, updateURLWithFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters(createEmptyFilters(effectiveFilters));
    setPriceRange({ min: "", max: "" });
    setSortBy("default");
    setPage(1);

    const params = new URLSearchParams();
    applyBaseCategoryParams(params);
    params.set("page", "1");
    navigate(`/products?${params.toString()}`, { replace: true });
  }, [effectiveFilters, applyBaseCategoryParams, navigate]);

  const handleCategoryChange = useCallback(
    (nextCategory) => {
      if (isUniversalMode || nextCategory === category) return;

      setFilters(createEmptyFilters(fallbackFilters));
      setPriceRange({ min: "", max: "" });
      setSortBy("default");
      setPage(1);

      navigate(`/products?category=${nextCategory}`, { replace: true });
    },
    [isUniversalMode, category, fallbackFilters, navigate],
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      setPage(nextPage);
      const params = new URLSearchParams(searchParams);
      params.set("page", String(nextPage));
      navigate(`/products?${params.toString()}`, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [searchParams, navigate],
  );

  const categoryLabel = isUniversalMode
    ? productTypeNameFromQuery || allProducts?.[0]?.productType?.name || "San pham"
    : LEGACY_DISPLAY_LABELS[category] || category;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery
              ? `Ket qua tim kiem: "${searchQuery}"`
              : modelParam
                ? `${categoryLabel} ${modelParam}`
                : categoryLabel}
          </h1>
          {searchQuery && (
            <p className="text-sm text-gray-600">Danh muc: {categoryLabel}</p>
          )}
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onFilterChange={handleFilterToggle}
              priceRange={priceRange}
              onPriceChange={handlePriceChange}
              availableFilters={effectiveFilters}
              onClearFilters={clearFilters}
              activeFiltersCount={activeFiltersCount}
              currentCategory={isUniversalMode ? "" : category}
              hideCategory={isUniversalMode}
              isCategoryPage={isUniversalMode}
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
              <p className="text-sm text-gray-600">
                Tim thay <span className="font-semibold">{total}</span> san pham
                {page > 1 && totalPages > 0 && ` - Trang ${page}/${totalPages}`}
              </p>

              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(event) => handleSortChange(event.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden flex items-center gap-2 h-10"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Bo loc
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
                    <SheetHeader className="sticky top-0 bg-white border-b z-10 p-6 pb-4">
                      <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl font-bold">
                          Bo loc san pham
                        </SheetTitle>
                        <button
                          onClick={() => setMobileFiltersOpen(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </SheetHeader>

                    <div className="p-6 pt-2 pb-32">
                      <ProductFilters
                        filters={filters}
                        onFilterChange={handleFilterToggle}
                        priceRange={priceRange}
                        onPriceChange={handlePriceChange}
                        availableFilters={effectiveFilters}
                        onClearFilters={clearFilters}
                        activeFiltersCount={activeFiltersCount}
                        currentCategory={isUniversalMode ? "" : category}
                        onCategoryChange={handleCategoryChange}
                        hideCategory={isUniversalMode}
                        isCategoryPage={isUniversalMode}
                      />
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                      <Button
                        size="lg"
                        className="w-full h-12 text-lg font-semibold"
                        onClick={() => setMobileFiltersOpen(false)}
                      >
                        Xem {total.toLocaleString("vi-VN")} san pham
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-sm p-4 animate-pulse"
                  >
                    <div className="aspect-[3/4] bg-gray-200 rounded-xl mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <p className="text-lg font-semibold">Da xay ra loi</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={fetchProducts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Thu lai
                </button>
              </div>
            )}

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

            {!loading && !error && products.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold mb-2">Khong tim thay san pham</p>
                <p className="text-sm">
                  Thu thay doi bo loc hoac tim kiem voi tu khoa khac
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Xoa bo loc
                  </button>
                )}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                >
                  Truoc
                </Button>

                <Button
                  variant={page === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>

                {page > 4 && totalPages > 7 && (
                  <span className="px-3 py-2 text-gray-500 font-medium">...</span>
                )}

                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (pageNumber) =>
                      pageNumber !== 1 &&
                      pageNumber !== totalPages &&
                      pageNumber >= page - 2 &&
                      pageNumber <= page + 2,
                  )
                  .map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={page === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}

                {page < totalPages - 3 && totalPages > 7 && (
                  <span className="px-3 py-2 text-gray-500 font-medium">...</span>
                )}

                {totalPages > 1 && (
                  <Button
                    variant={page === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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
