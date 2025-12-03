import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductCard from "@/components/shared/ProductCard";
import axios from "axios";

const CATEGORY_ROUTE_MAP = {
  iPhone: "dien-thoai",
  iPad: "may-tinh-bang",
  Mac: "macbook",
  AirPods: "tai-nghe",
  AppleWatch: "apple-watch",
  Accessories: "phu-kien",
};

/**
 * Tính điểm liên quan dựa trên tên sản phẩm
 * Logic: Nếu sản phẩm có model tương tự (iPhone 17, iPhone 17 Pro, ...) thì ưu tiên
 */
const calculateRelevanceScore = (productName, baseProductName) => {
  const name = productName.toLowerCase();
  const baseName = baseProductName.toLowerCase();

  let score = 0;

  // Chiết xuất model chính (iPhone 17, iPhone 16, ...)
  const modelRegex = /(\w+\s+\d+)\s*(pro|max|plus|mini|air)?/i;
  const currentMatch = name.match(modelRegex);
  const baseMatch = baseName.match(modelRegex);

  if (currentMatch && baseMatch) {
    // Cùng dòng model (iPhone 17 vs iPhone 17 Pro)
    if (currentMatch[1].toLowerCase() === baseMatch[1].toLowerCase()) {
      score += 50; // Điểm cao - cùng dòng sản phẩm
    }
    // Cùng thương hiệu nhưng khác thế hệ (iPhone 17 vs iPhone 16)
    else if (
      currentMatch[1].split(" ")[0].toLowerCase() ===
      baseMatch[1].split(" ")[0].toLowerCase()
    ) {
      score += 30; // Điểm trung bình - cùng thương hiệu
    }
  }

  // Ưu tiên sản phẩm có variant (nhiều tùy chọn)
  score += 10;

  return score;
};

const SimilarProducts = ({ productId, category }) => {
  const navigate = useNavigate();
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef(null);
  const [currentProduct, setCurrentProduct] = useState(null);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      if (!productId || !category) {
        console.log(
          "[SimilarProducts] Missing productId or category",
          { productId, category }
        );
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("[SimilarProducts] Fetching similar products", {
          productId,
          category,
        });

        const baseURL = import.meta.env.VITE_API_URL || "/api";
        const response = await axios.get(
          `${baseURL}/products/${productId}/related`,
          {
            withCredentials: true,
          }
        );

        console.log(
          "[SimilarProducts] API Response:",
          response.data
        );

        let products = response.data?.data?.products || [];

        if (!Array.isArray(products)) {
          console.warn("[SimilarProducts] Products is not an array:", products);
          products = [];
        }

        console.log(`[SimilarProducts] Fetched ${products.length} products`);

        // Thêm log chi tiết từng sản phẩm
        products.forEach((p, idx) => {
          console.log(`[SimilarProducts] Product ${idx}:`, {
            id: p._id,
            name: p.name,
            model: p.model,
            variants: p.variants?.length || 0,
            images: p.images?.length || 0,
            price: p.price,
          });
        });

        // Tính điểm liên quan và sắp xếp
        const productsWithScore = products
          .map((product) => ({
            ...product,
            _relevanceScore: calculateRelevanceScore(product.name, currentProduct?.name || ""),
          }))
          .sort((a, b) => {
            // Sắp xếp theo: điểm liên quan DESC → đánh giá DESC → tên ASC
            if (b._relevanceScore !== a._relevanceScore) {
              return b._relevanceScore - a._relevanceScore;
            }
            if ((b.averageRating || 0) !== (a.averageRating || 0)) {
              return (b.averageRating || 0) - (a.averageRating || 0);
            }
            return (a.name || "").localeCompare(b.name || "");
          });

        console.log(
          "[SimilarProducts] Sorted products:",
          productsWithScore.map((p) => ({
            name: p.name,
            score: p._relevanceScore,
            rating: p.averageRating,
          }))
        );

        setSimilarProducts(productsWithScore);
      } catch (err) {
        console.error("[SimilarProducts] Error fetching similar products:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        setError(err.message);
        setSimilarProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [productId, category, currentProduct?.name]);

  // Fetch thông tin sản phẩm hiện tại
  useEffect(() => {
    if (!productId || !category) return;

    const fetchCurrentProduct = async () => {
      try {
        const categoryRouteMap = {
          iPhone: "iphones",
          iPad: "ipads",
          Mac: "macs",
          AirPods: "airpods",
          AppleWatch: "applewatches",
          Accessory: "accessories",
        };

        const apiBase = categoryRouteMap[category];
        if (!apiBase) return;

        const baseURL = import.meta.env.VITE_API_URL || "/api";
        const response = await axios.get(`${baseURL}/${apiBase}/${productId}`, {
          withCredentials: true,
        });

        const product = response.data?.data?.product || response.data?.data;
        setCurrentProduct(product);
        console.log("[SimilarProducts] Current product:", {
          name: product?.name,
          model: product?.model,
        });
      } catch (err) {
        console.error("[SimilarProducts] Error fetching current product:", err.message);
      }
    };

    fetchCurrentProduct();
  }, [productId, category]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 300;
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setScrollPosition(newPosition);
  };

  /**
   * Xử lý click vào sản phẩm - reload trang để chuyển sản phẩm
   */
  const handleProductClick = (product) => {
    console.log("[SimilarProducts] Product clicked:", {
      name: product.name,
      baseSlug: product.baseSlug,
      variants: product.variants?.length || 0,
    });

    if (!product.baseSlug) {
      console.warn("[SimilarProducts] Product missing baseSlug");
      return;
    }

    const categoryPath = CATEGORY_ROUTE_MAP[category];
    if (!categoryPath) {
      console.warn("[SimilarProducts] Unknown category:", category);
      return;
    }

    // Chọn variant đầu tiên có stock
    const selectedVariant = product.variants?.find((v) => v.stock > 0);
    const sku = selectedVariant?.sku;

    let url = `/${categoryPath}/${product.baseSlug}`;
    if (sku) {
      url += `?sku=${sku}`;
    }

    console.log("[SimilarProducts] Navigating to:", url);

    // Reload trang để chuyển sản phẩm
    window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    console.warn("[SimilarProducts] Error state:", error);
    return null;
  }

  if (!similarProducts || similarProducts.length === 0) {
    console.log("[SimilarProducts] No similar products to display");
    return null;
  }

  console.log("[SimilarProducts] Rendering", similarProducts.length, "products");

  return (
    <div className="py-8 bg-white rounded-lg">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Sản phẩm tương tự
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Products Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {similarProducts.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0 w-[280px] cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              <ProductCard product={product} />
              {/* DEBUG BADGE - Xóa sau khi test xong */}
              
            </div>
          ))}
        </div>

        {/* CSS to hide scrollbar */}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SimilarProducts;
