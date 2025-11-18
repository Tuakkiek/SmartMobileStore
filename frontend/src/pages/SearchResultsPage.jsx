import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, SlidersHorizontal, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shared/ProductCard";
import ProductFilters from "@/components/shared/ProductFilters";
import { Loading } from "@/components/shared/Loading";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

// ============================================
// CONFIG
// ============================================
const SEARCH_CATEGORIES = [
  { id: "iphone", name: "iPhone", api: iPhoneAPI, route: "dien-thoai" },
  { id: "ipad", name: "iPad", api: iPadAPI, route: "may-tinh-bang" },
  { id: "mac", name: "Mac", api: macAPI, route: "macbook" },
  { id: "airpods", name: "AirPods", api: airPodsAPI, route: "tai-nghe" },
  {
    id: "watch",
    name: "Apple Watch",
    api: appleWatchAPI,
    route: "apple-watch",
  },
  { id: "accessories", name: "Phụ kiện", api: accessoryAPI, route: "phu-kien" },
];

// Bộ lọc tổng hợp cho trang tìm kiếm
const SEARCH_AVAILABLE_FILTERS = {
  condition: ["NEW", "LIKE_NEW"],
  storage: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  // Có thể thêm RAM nếu muốn
};

const ITEMS_PER_PAGE = 12;

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get("s") || "";
  const pageParam = parseInt(searchParams.get("page")) || 1;

  // ============================================
  // STATE
  // ============================================
  const [allProducts, setAllProducts] = useState([]); // Dữ liệu thô
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    condition: [],
    storage: [],
  });
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // ============================================
  // FETCH DATA (Song song từ tất cả nguồn)
  // ============================================
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        navigate("/");
        return;
      }

      setIsLoading(true);
      try {
        // Fetch 100 items mỗi loại để có đủ dữ liệu lọc client-side
        const searchPromises = SEARCH_CATEGORIES.map(async (category) => {
          try {
            const response = await category.api.getAll({
              search: searchQuery,
              limit: 50,
            });
            const products = response.data?.data?.products || [];
            return products.map((product) => ({
              ...product,
              _category: category.route,
              _categoryName: category.name,
            }));
          } catch (error) {
            return [];
          }
        });

        const results = await Promise.all(searchPromises);
        // Gộp mảng và Shuffle nhẹ hoặc sắp xếp theo độ liên quan (nếu API chưa làm)
        setAllProducts(results.flat());
      } catch (error) {
        console.error("Search error:", error);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, navigate]);

  // ============================================
  // FILTER LOGIC (Client Side)
  // ============================================
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Filter by Condition
      if (filters.condition.length > 0) {
        if (!filters.condition.includes(product.condition)) return false;
      }

      // 2. Filter by Storage (Check variants)
      if (filters.storage.length > 0) {
        const hasMatchingStorage = product.variants?.some((v) =>
          filters.storage.includes(v.storage)
        );
        if (!hasMatchingStorage) return false;
      }

      // 3. Filter by Price (Check variants range)
      if (priceRange.min || priceRange.max) {
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;

        // Check nếu có bất kỳ biến thể nào nằm trong khoảng giá
        const hasMatchingPrice = product.variants?.some((v) => {
          const p = v.price || 0;
          return p >= min && p <= max;
        });

        // Fallback nếu không có variants (check giá gốc product)
        const productPrice = product.price || 0;
        const isProductMatch = productPrice >= min && productPrice <= max;

        if (!hasMatchingPrice && !isProductMatch) return false;
      }

      return true;
    });
  }, [allProducts, filters, priceRange]);

  // ============================================
  // PAGINATION LOGIC (Client Side)
  // ============================================
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (pageParam - 1) * ITEMS_PER_PAGE,
    pageParam * ITEMS_PER_PAGE
  );

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    if (pageParam !== 1) {
      // Logic này để tránh loop, chỉ set về 1 nếu đang filter mà page > 1
      // Nhưng ở đây ta dùng URL làm source of truth cho page nên cần cẩn thận
    }
  }, [filters, priceRange]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleFilterChange = (type, value) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
    setSearchParams({ s: searchQuery, page: 1 }); // Reset page
  };

  const handlePriceChange = (newRange) => {
    setPriceRange(newRange);
    setSearchParams({ s: searchQuery, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({ condition: [], storage: [] });
    setPriceRange({ min: "", max: "" });
    setSearchParams({ s: searchQuery, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ s: searchQuery, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFiltersCount =
    filters.condition.length +
    filters.storage.length +
    (priceRange.min || priceRange.max ? 1 : 0);

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 pl-0 hover:pl-2 transition-all text-gray-500 hover:text-black hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại trang chủ
          </Button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Kết quả tìm kiếm: "{searchQuery}"
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Tìm thấy{" "}
                <span className="font-bold text-black">
                  {filteredProducts.length}
                </span>{" "}
                sản phẩm phù hợp
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-8 items-start">
          {/* ======================== */}
          {/* SIDEBAR FILTER (Desktop) */}
          {/* ======================== */}
          <aside
            className={`
                lg:w-64 lg:block flex-shrink-0
                ${
                  showMobileFilter
                    ? "block fixed inset-0 z-50 bg-black/50 lg:static lg:bg-transparent"
                    : "hidden"
                }
            `}
          >
            <div
              className={`
                    h-full lg:h-auto overflow-y-auto lg:overflow-visible
                    bg-white lg:bg-transparent p-4 lg:p-0 w-80 lg:w-full ml-auto lg:ml-0
                    lg:sticky lg:top-24 transition-transform duration-300
                `}
            >
              <div className="lg:hidden flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Bộ lọc</h2>
                <button onClick={() => setShowMobileFilter(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <ProductFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                priceRange={priceRange}
                onPriceChange={handlePriceChange}
                availableFilters={SEARCH_AVAILABLE_FILTERS}
                onClearFilters={handleClearFilters}
                activeFiltersCount={activeFiltersCount}
              />

              {/* Mobile Action Buttons */}
              <div className="lg:hidden mt-6 flex gap-2">
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="w-full"
                >
                  Xóa
                </Button>
                <Button
                  onClick={() => setShowMobileFilter(false)}
                  className="w-full"
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </aside>

          {/* ======================== */}
          {/* MAIN GRID */}
          {/* ======================== */}
          <main className="flex-1 min-w-0">
            {currentProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      showVariantsBadge={true}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center gap-2">
                    <button
                      onClick={() =>
                        handlePageChange(Math.max(1, pageParam - 1))
                      }
                      disabled={pageParam === 1}
                      className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`w-10 h-10 rounded-lg ${
                          pageParam === i + 1
                            ? "bg-black text-white font-medium"
                            : "bg-white border hover:bg-gray-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, pageParam + 1))
                      }
                      disabled={pageParam === totalPages}
                      className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Không tìm thấy kết quả
                </h3>
                <p className="text-gray-500 mb-6">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.
                </p>
                <Button onClick={handleClearFilters} variant="outline">
                  Xóa bộ lọc & Tìm lại
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
