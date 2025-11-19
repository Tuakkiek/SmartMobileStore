import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, Package, X } from "lucide-react";
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

const SEARCH_AVAILABLE_FILTERS = {
  condition: ["NEW", "LIKE_NEW"],
  storage: ["64GB", "128GB", "256GB", "512GB", "1TB"],
};

const ITEMS_PER_PAGE = 12;

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get("s")?.trim() || "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const [filters, setFilters] = useState({ condition: [], storage: [] });
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // FETCH DATA
  useEffect(() => {
    if (!searchQuery) {
      navigate("/", { replace: true });
      return;
    }

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const promises = SEARCH_CATEGORIES.map(async (cat) => {
          try {
            const res = await cat.api.getAll({
              search: searchQuery,
              limit: 50,
            });
            return (res.data?.data?.products || []).map((p) => ({
              ...p,
              _category: cat.route,
              _categoryName: cat.name,
            }));
          } catch {
            return [];
          }
        });
        const results = await Promise.all(promises);
        setAllProducts(results.flat());
      } catch (err) {
        console.error(err);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [searchQuery, navigate]);

  // FILTER LOGIC
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // Lọc theo tình trạng
      if (
        filters.condition.length &&
        !filters.condition.includes(product.condition)
      )
        return false;

      // Lọc theo dung lượng
      if (
        filters.storage.length &&
        !product.variants?.some((v) => filters.storage.includes(v.storage))
      )
        return false;

      // Lọc theo khoảng giá
      if (priceRange.min || priceRange.max) {
        const min = priceRange.min ? Number(priceRange.min) : 0;
        const max = priceRange.max ? Number(priceRange.max) : Infinity;

        const inRange =
          product.variants?.some((v) => {
            const price = v.price || 0;
            return price >= min && price <= max;
          }) ||
          ((product.price || 0) >= min && (product.price || 0) <= max);

        if (!inRange) return false;
      }

      return true;
    });
  }, [allProducts, filters, priceRange]);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    if (pageParam !== 1) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", "1");
        return next;
      });
    }
  }, [filters, priceRange, pageParam, setSearchParams]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (pageParam - 1) * ITEMS_PER_PAGE,
    pageParam * ITEMS_PER_PAGE
  );

  // HANDLERS
  const handleFilterChange = (type, value) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
  };

  const handlePriceChange = (newRange) => setPriceRange(newRange);

  const handleClearFilters = () => {
    setFilters({ condition: [], storage: [] });
    setPriceRange({ min: "", max: "" });
  };

  const handlePageChange = (page) => {
    setSearchParams({ s: searchQuery, page: page.toString() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFiltersCount =
    filters.condition.length +
    filters.storage.length +
    (priceRange.min || priceRange.max ? 1 : 0);

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Kết quả tìm kiếm:{" "}
            <span className="text-blue-600">"{searchQuery}"</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Tìm thấy <strong>{filteredProducts.length}</strong> sản phẩm
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filter */}
          <aside
            className={`fixed inset-0 z-50 bg-white lg:relative lg:z-auto ${
              showMobileFilter ? "block" : "hidden lg:block"
            } lg:w-80 flex-shrink-0`}
          >
            {/* Overlay mobile */}
            {showMobileFilter && (
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setShowMobileFilter(false)}
              />
            )}
            {/* Nội dung filter */}
            <div className="relative h-full bg-white rounded-lg lg:rounded-none shadow-lg lg:shadow-none p-5 lg:p-0 lg:sticky lg:top-24 overflow-y-auto">
              {/* Header mobile */}
              <div className="flex justify-between items-center mb-4 lg:hidden">
                <h2 className="text-lg font-bold">Bộ lọc</h2>
                <button onClick={() => setShowMobileFilter(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Component lọc */}
              <ProductFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                priceRange={priceRange}
                onPriceChange={handlePriceChange}
                availableFilters={SEARCH_AVAILABLE_FILTERS}
                onClearFilters={handleClearFilters}
                activeFiltersCount={activeFiltersCount}
                hideCategory={true}
              />

              {/* Nút mobile */}
              <div className="mt-6 flex gap-3 lg:hidden">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex-1"
                >
                  Xóa tất cả
                </Button>
                <Button
                  onClick={() => setShowMobileFilter(false)}
                  className="flex-1"
                >
                  Xem {filteredProducts.length} kết quả
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Nút mở filter trên mobile */}
            <div className="mb-4 lg:hidden">
              <Button
                variant="outline"
                onClick={() => setShowMobileFilter(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc
                {activeFiltersCount > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Danh sách sản phẩm */}
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
                  <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      disabled={pageParam === 1}
                      onClick={() => handlePageChange(pageParam - 1)}
                    >
                      Trước
                    </Button>

                    {/* Hiển thị tối đa 7 trang + dấu ... + trang cuối */}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const page = i + 1;
                      if (totalPages > 7 && i === 6) {
                        return <span key="dots">...</span>;
                      }
                      return (
                        <Button
                          key={page}
                          variant={pageParam === page ? "default" : "outline"}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}

                    {totalPages > 7 && (
                      <Button
                        variant={
                          pageParam === totalPages ? "default" : "outline"
                        }
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      disabled={pageParam === totalPages}
                      onClick={() => handlePageChange(pageParam + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Không tìm thấy sản phẩm nào
                </h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc để xem thêm kết quả.
                </p>
                <Button onClick={handleClearFilters} size="lg">
                  Xóa bộ lọc & thử lại
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
