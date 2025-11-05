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
import ProductCard from "@/components/shared/ProductCard"; // IMPORTED

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

const FILTER_OPTIONS = {
  storage: ["128 GB", "256 GB", "512 GB", "1 TB", "2 TB"],
  ram: ["8 GB", "12 GB", "16 GB", "24 GB", "32 GB"],
  screenSize: ["Dưới 6 inch", "6 - 6.5 inch", "Trên 6.5 inch"],
  refreshRate: ["60 Hz", "90 Hz", "120 Hz"],
};

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const categoryParam = searchParams.get("category") || "iPhone";
  const modelParam = searchParams.get("model") || "";

  const category =
    categoryParam === "AppleWatch"
      ? "AppleWatch"
      : categoryParam === "Accessories"
      ? "Accessories"
      : categoryParam;
  const api = API_MAP[category] || iPhoneAPI;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;
  const [filters, setFilters] = useState({
    storage: [],
    ram: [],
    screenSize: [],
    refreshRate: [],
  });

  const [expandedSections, setExpandedSections] = useState({
    storage: true,
    ram: true,
    screenSize: true,
    refreshRate: true,
  });

  // Sync filters from URL
  useEffect(() => {
    const storage = searchParams.get("storage")?.split(",") || [];
    const ram = searchParams.get("ram")?.split(",") || [];
    const screenSize = searchParams.get("screenSize")?.split(",") || [];
    const refreshRate = searchParams.get("refreshRate")?.split(",") || [];

    setFilters({ storage, ram, screenSize, refreshRate });
  }, [searchParams]);

  // Update URL
  const updateURL = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    Object.keys(filters).forEach((key) => {
      if (filters[key].length > 0) params.set(key, filters[key].join(","));
      else params.delete(key);
    });
    params.set("page", page);
    navigate(`?${params.toString()}`, { replace: true });
  }, [filters, page, searchParams, navigate]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit,
        page,
        model: modelParam || undefined,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v.length > 0)
        ),
      };

      const response = await api.get(modelParam || "", { params });
      const data = response.data?.data;

      setProducts(data?.products || []);
      setTotal(data?.total || data?.products?.length || 0);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Không thể tải sản phẩm.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [api, modelParam, filters, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [categoryParam, modelParam, page]);

  // Handlers
  const handleFilterToggle = (type, value) => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [type]: prev[type].includes(value)
          ? prev[type].filter((v) => v !== value)
          : [...prev[type], value],
      };
      const params = new URLSearchParams(searchParams);
      Object.keys(newFilters).forEach((key) => {
        if (newFilters[key].length > 0)
          params.set(key, newFilters[key].join(","));
        else params.delete(key);
      });
      params.set("page", 1);
      navigate(`?${params.toString()}`, { replace: true });
      return newFilters;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clearFilters = () => {
    setFilters({ storage: [], ram: [], screenSize: [], refreshRate: [] });
    setPage(1);
  };

  const activeFiltersCount = Object.values(filters).reduce(
    (a, b) => a + b.length,
    0
  );
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {modelParam ? `${category} ${modelParam} Series` : category}
          </h1>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
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
                    Xóa {activeFiltersCount}
                  </button>
                )}
              </div>

              {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
                <div key={key} className="mb-4">
                  <button
                    onClick={() => toggleSection(key)}
                    className="flex items-center justify-between w-full mb-3"
                  >
                    <span className="font-medium text-sm">
                      {key === "storage"
                        ? "ROM"
                        : key === "ram"
                        ? "RAM"
                        : key === "screenSize"
                        ? "Màn hình"
                        : "Tần số quét"}
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
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={filters[key].includes(opt)}
                            onChange={() => handleFilterToggle(key, opt)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {key !== "refreshRate" && (
                    <div className="border-t my-4"></div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Tìm thấy <span className="font-semibold">{total}</span> kết quả
              </p>
              <button className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                <SlidersHorizontal className="w-4 h-4" /> Bộ lọc
                {activeFiltersCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Loading */}
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

            {/* Error */}
            {error && !loading && (
              <div className="text-center py-12 text-red-600">
                <p>{error}</p>
                <button
                  onClick={fetchProducts}
                  className="mt-2 text-blue-600 underline"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Products Grid – DÙNG ProductCard */}
            {!loading && !error && products.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => {
                  const isTopSeller = product.isTopSeller || false;
                  const isTopNew = product.isTopNew || false;

                  return (
                    <ProductCard
                      key={product._id}
                      product={product}
                      isTopSeller={isTopSeller}
                      isTopNew={isTopNew}
                      // Admin callbacks (nếu cần)
                      // onEdit={() => handleEdit(product)}
                      // onDelete={() => handleDelete(product._id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Không tìm thấy sản phẩm.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1 rounded ${
                          page === p
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
