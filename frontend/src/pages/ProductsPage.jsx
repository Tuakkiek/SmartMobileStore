// ============================================
// FILE: frontend/src/pages/ProductsPage.jsx
// ✅ UPDATED: Use category APIs instead of productAPI
// ============================================

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ProductCard from "../components/shared/ProductCard";
import { Loading } from "@/components/shared/Loading";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AppleWatch",
  "AirPods",
  "Accessories",
];

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AppleWatch: appleWatchAPI,
  AirPods: airPodsAPI,
  Accessories: accessoryAPI,
};

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    status: "",
    minPrice: "",
    maxPrice: "",
    sort: "createdAt",
    inStock: false,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalPages: 1,
    total: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  // ✅ Fetch products from category APIs
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: filters.status || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        sort: filters.sort,
        inStock: filters.inStock,
      };

      let allProducts = [];
      let totalCount = 0;

      if (filters.category) {
        // Fetch from specific category
        const api = API_MAP[filters.category];
        if (api) {
          const response = await api.getAll(params);
          const data = response.data.data;
          allProducts = data.products || [];
          totalCount = data.total || allProducts.length;
        }
      } else {
        // Fetch from all categories
        const responses = await Promise.all(
          CATEGORIES.map((cat) =>
            API_MAP[cat]
              .getAll({ ...params, limit: 3 })
              .catch(() => ({ data: { data: { products: [] } } }))
          )
        );

        allProducts = responses
          .flatMap((r) => r.data.data.products || [])
          .slice(0, pagination.limit);
        totalCount = allProducts.length;
      }

      // Add category info and format prices
      const formattedProducts = allProducts.map((product) => ({
        ...product,
        price: product.price || 0,
        originalPrice: product.originalPrice || 0,
        hasVariants: (product.variants?.length || 0) > 0,
      }));

      setProducts(formattedProducts);
      setPagination({
        ...pagination,
        totalPages: Math.ceil(totalCount / pagination.limit) || 1,
        total: totalCount,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, filters, searchTerm]);

  useEffect(() => {
    const category = searchParams.get("category");
    if (category && category !== filters.category) {
      setFilters({ ...filters, category });
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });

    if (key === "category") {
      if (value) {
        searchParams.set("category", value);
      } else {
        searchParams.delete("category");
      }
      setSearchParams(searchParams);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      status: "",
      minPrice: "",
      maxPrice: "",
      sort: "createdAt",
      inStock: false,
    });
    setSearchTerm("");
    searchParams.delete("category");
    setSearchParams(searchParams);
    setPagination({ ...pagination, page: 1 });
  };

  const activeFiltersCount = [
    filters.category,
    filters.status,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Sản phẩm</h1>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Bộ lọc
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              <select
                className="px-4 py-2 border rounded-md"
                value={filters.sort}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
              >
                <option value="createdAt">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao</option>
                <option value="name">Tên A-Z</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Đang lọc:</span>
              {filters.category && (
                <Badge variant="secondary" className="gap-1">
                  Danh mục: {filters.category}
                  <button
                    onClick={() => handleFilterChange("category", "")}
                    className="ml-1 hover:bg-gray-300 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Xóa tất cả
              </Button>
            </div>
          )}

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Danh mục</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={filters.category}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                  >
                    <option value="">Tất cả danh mục</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={filters.inStock}
                  onChange={(e) =>
                    handleFilterChange("inStock", e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <label
                  htmlFor="inStock"
                  className="text-sm font-medium cursor-pointer"
                >
                  Chỉ hiển thị sản phẩm còn hàng
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Tìm thấy {pagination.total} sản phẩm
          {filters.category && ` trong danh mục ${filters.category}`}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <Loading />
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Không tìm thấy sản phẩm nào
          </p>
          <Button variant="outline" onClick={clearFilters} className="mt-4">
            Xóa bộ lọc
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                showVariantsBadge={product.hasVariants}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
              >
                Trước
              </Button>
              <div className="flex items-center px-4">
                Trang {pagination.page} / {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductsPage;
