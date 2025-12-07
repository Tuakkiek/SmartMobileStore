// ============================================
// FILE: frontend/src/pages/SearchResultsPage.jsx
// ✅ UPGRADED: Sử dụng Full-Text Search API
// ============================================

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, Package, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shared/ProductCard";
import ProductFilters from "@/components/shared/ProductFilters";
import { Loading } from "@/components/shared/Loading";
import { searchAPI } from "@/lib/api"; // ← UPDATED IMPORT
import { useAuthStore } from "@/store/authStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const [correctedQuery, setCorrectedQuery] = useState(null);
  const [extractedAttributes, setExtractedAttributes] = useState(null);

  const [filters, setFilters] = useState({ condition: [], storage: [] });
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const { isAuthenticated, user } = useAuthStore();
   const isAdmin = user?.role === "ADMIN";

  // ============================================
  // FETCH DATA using Full-Text Search API
  // ============================================
  useEffect(() => {
    if (!searchQuery) {
      navigate("/", { replace: true });
      return;
    }

    const fetchSearchResults = async () => {
      setIsLoading(true);
      try {
        const response = await searchAPI.search({
          // ← UPDATED TO USE searchAPI
          q: searchQuery,
          limit: 100, // Get more for client-side filtering
        });

        if (response.data?.success) {
          const data = response.data.data;
          setAllProducts(data.results || []);
          setCorrectedQuery(data.correctedQuery);
          setExtractedAttributes(data.extractedAttributes);
        } else {
          setAllProducts([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchQuery, navigate]);

  // ============================================
  // FILTER LOGIC
  // ============================================
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // Filter by condition
      if (
        filters.condition.length &&
        !filters.condition.includes(product.condition)
      ) {
        return false;
      }

      // Filter by storage
      if (filters.storage.length) {
        const hasMatchingStorage = product.variants?.some((v) =>
          filters.storage.includes(v.storage)
        );
        if (!hasMatchingStorage) return false;
      }

      // Filter by price range
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

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pageParam !== 1) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", "1");
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, priceRange]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (pageParam - 1) * ITEMS_PER_PAGE,
    pageParam * ITEMS_PER_PAGE
  );

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

          {/* Corrected Query Notice */}
          {correctedQuery && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">
                Đã tự động sửa thành:{" "}
                <span className="text-blue-600 font-medium">
                  {correctedQuery}
                </span>
              </span>
            </div>
          )}

          {/* Extracted Attributes */}
          {extractedAttributes && (
            <div className="mt-2 flex flex-wrap gap-2">
              {extractedAttributes.storage && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {extractedAttributes.storage}
                </span>
              )}
              {extractedAttributes.color && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Màu: {extractedAttributes.color}
                </span>
              )}
              {extractedAttributes.model && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Model: {extractedAttributes.model}
                </span>
              )}
            </div>
          )}

          <p className="text-gray-600 mt-2">
            Tìm thấy <strong>{filteredProducts.length}</strong> sản phẩm
          </p>
        </div>

        <div className="flex gap-8">
          {/* ==================== DESKTOP FILTER (giữ nguyên như cũ) ==================== */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-xl shadow-sm p-5">
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
            </div>
          </aside>

          {/* ==================== NỘI DUNG CHÍNH ==================== */}
          <main className="flex-1">
            {/* Nút mở filter trên mobile */}
            <div className="mb-5 lg:hidden">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 flex items-center justify-center gap-3 text-base font-medium"
                onClick={() => setShowMobileFilter(true)}
              >
                <SlidersHorizontal className="w-5 h-5" />
                Bộ lọc
                {activeFiltersCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {/* ==================== MOBILE FILTER SHEET (ĐẸP + KHÔNG LỖI) ==================== */}
            <Sheet open={showMobileFilter} onOpenChange={setShowMobileFilter}>
              <SheetContent side="left" className="w-[90vw] sm:w-[400px] p-0">
                {/* Header */}
                <SheetHeader className="sticky top-0 bg-white border-b z-10 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-xl font-bold">
                      Bộ lọc tìm kiếm
                    </SheetTitle>
                    <button
                      onClick={() => setShowMobileFilter(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </SheetHeader>

                {/* Nội dung filter – chừa chỗ cho nút dưới */}
                <div className="px-6 pt-4 pb-36 overflow-y-auto">
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
                </div>

                {/* Nút cố định dưới cùng – KHÔNG bị đè input giá */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl z-20">
                  <div className="flex gap-3 max-w-md mx-auto">
                    <Button
                      size="lg"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowMobileFilter(false)}
                    >
                      Xem {filteredProducts.length.toLocaleString("vi-VN")} kết quả
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {currentProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {currentProducts.map((product) => (
                    <div key={product._id} className="relative">
                      <ProductCard product={product} showVariantsBadge={true} />
                      {/* Relevance Score Badge (for debugging) */}
                      {isAdmin && product._relevance > 0 && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                          {product._relevance}%
                        </div>
                      )}
                    </div>
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
