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

// Copy các functions từ SearchOverlay
const TYPO_MAPPINGS = {
  // iPhone
  ip: "iphone",
  ifone: "iphone",
  iphon: "iphone",
  iphoen: "iphone",
  ipone: "iphone",
  "ai phôn": "iphone",
  "dt ip": "iphone",
  ip15: "iphone 15",
  ip14: "iphone 14",
  ip13: "iphone 13",
  "15pm": "iphone 15 pro max",

  // THÊM MỚI - Các biến thể phổ biến
  plus: "plus",
  pls: "plus",
  pluss: "plus",
  pro: "pro",
  promax: "pro max",
  "pro max": "pro max",
  max: "max",
  mini: "mini",

  // Màu sắc
  den: "đen",
  trang: "trắng",
  xanh: "xanh",
  do: "đỏ",

  // Dung lượng
  "128gb": "128gb",
  "256gb": "256gb",
  "512gb": "512gb",
  "1tb": "1tb",

  // iPad
  iapd: "ipad",
  pad: "ipad",
  taplet: "ipad",
  "may tinh bang": "ipad",
  // Mac
  mac: "macbook",
  macbok: "macbook",
  macboo: "macbook",
  "lap top": "macbook",
  mb: "macbook",
  mba: "macbook air",
  mbp: "macbook pro",
  // AirPods
  airpod: "airpods",
  aripod: "airpods",
  "tai nghe": "airpods",
  ap2: "airpods 2",
  ap3: "airpods 3",
  // Watch
  wach: "apple watch",
  wacth: "apple watch",
  "dong ho": "apple watch",
  aw: "apple watch",
  // Accessories
  sac: "sạc",
  cap: "cáp",
  "op lung": "ốp lưng",
  chuot: "chuột",
  "ban phim": "bàn phím",
};
const correctTypos = (input) => {
  if (!input) return "";
  let corrected = input.toLowerCase().trim();
  // Check khớp từ chính xác
  if (TYPO_MAPPINGS[corrected]) return TYPO_MAPPINGS[corrected];
  // Check thay thế từ trong câu
  Object.keys(TYPO_MAPPINGS).forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, TYPO_MAPPINGS[key]);
    }
  });
  return corrected;
};
/**
 * Tách query thành các tokens có ý nghĩa
 */
const tokenizeQuery = (query) => {
  if (!query) return [];

  const corrected = correctTypos(query);
  const tokens = corrected.toLowerCase().trim().split(/\s+/);

  // Lọc bỏ stop words (từ không quan trọng)
  const stopWords = ["the", "a", "an", "and", "or", "của", "cho", "với"];
  return tokens.filter(
    (token) => !stopWords.includes(token) && token.length > 0
  );
};
const calculateRelevanceScore = (productName, query) => {
  const name = productName.toLowerCase();
  const queryTokens = tokenizeQuery(query);

  if (queryTokens.length === 0) return 0;

  let score = 0;
  let matchedTokens = 0;

  // Khớp chính xác toàn bộ query
  if (name === query.toLowerCase()) {
    return 100;
  }

  // Tính điểm cho từng token
  queryTokens.forEach((token) => {
    // Khớp chính xác từ độc lập (word boundary)
    const wordBoundaryRegex = new RegExp(`\\b${token}\\b`, "i");
    if (wordBoundaryRegex.test(name)) {
      matchedTokens++;
      score += 30; // Điểm cao cho khớp chính xác

      // Thêm điểm nếu token xuất hiện ở đầu
      if (name.startsWith(token)) {
        score += 15;
      }
    }
    // Khớp một phần từ
    else if (name.includes(token)) {
      matchedTokens++;
      score += 15; // Điểm thấp hơn cho khớp một phần
    }
  });

  // Tính tỷ lệ khớp
  const matchRatio = matchedTokens / queryTokens.length;

  // Thêm điểm bonus nếu khớp nhiều từ
  if (matchRatio >= 0.8) {
    score += 20;
  } else if (matchRatio >= 0.5) {
    score += 10;
  }

  // Thêm điểm nếu query xuất hiện liên tiếp trong name
  if (name.includes(query.toLowerCase())) {
    score += 25;
  }

  // Penalty nếu tên sản phẩm quá dài so với query
  const lengthDiff = Math.abs(name.length - query.length);
  if (lengthDiff > 20) {
    score -= 5;
  }

  return Math.min(score, 100); // Cap tối đa 100 điểm
};

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
        const correctedQuery = correctTypos(searchQuery);
        const queryTokens = tokenizeQuery(correctedQuery);

        const promises = SEARCH_CATEGORIES.map(async (cat) => {
          try {
            // Tìm với query gốc
            const mainRes = await cat.api.getAll({
              search: correctedQuery,
              limit: 50,
            });

            let products = mainRes.data?.data?.products || [];

            // Nếu ít kết quả, tìm thêm với tokens
            if (products.length < 10 && queryTokens.length > 1) {
              const tokenSearches = await Promise.all(
                queryTokens
                  .slice(0, 2)
                  .map((token) =>
                    cat.api
                      .getAll({ search: token, limit: 20 })
                      .catch(() => ({ data: { data: { products: [] } } }))
                  )
              );

              tokenSearches.forEach((res) => {
                const tokenProducts = res.data?.data?.products || [];
                tokenProducts.forEach((p) => {
                  if (!products.find((existing) => existing._id === p._id)) {
                    products.push(p);
                  }
                });
              });
            }

            return products.map((p) => ({
              ...p,
              _category: cat.route,
              _categoryName: cat.name,
              _score: calculateRelevanceScore(
                p.name || p.model,
                correctedQuery
              ),
            }));
          } catch {
            return [];
          }
        });

        const results = await Promise.all(promises);
        let allProducts = results.flat();

        // Sắp xếp theo điểm
        allProducts.sort((a, b) => b._score - a._score);

        setAllProducts(allProducts);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, priceRange]); // ← CHỈ theo dõi filters và priceRange, BỎ pageParam

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
                    <div key={product._id} className="relative">
                      <ProductCard product={product} showVariantsBadge={true} />
                      {/* THÊM DEBUG BADGE - XÓA SAU KHI TEST XONG */}
                      {product._score > 0 && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          {product._score}
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
