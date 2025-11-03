import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  Star,
  ShoppingCart,
  Shield,
  Truck,
  RefreshCw,
  Gift,
  CreditCard,
  Check,
  Package,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import { SpecificationsTab } from "@/components/product/SpecificationsTab";
import { WarrantyTab } from "@/components/product/WarrantyTab";

const CATEGORY_MAP = {
  "dien-thoai": { model: "iPhone", api: iPhoneAPI },
  "may-tinh-bang": { model: "iPad", api: iPadAPI },
  macbook: { model: "Mac", api: macAPI },
  "tai-nghe": { model: "AirPods", api: airPodsAPI },
  "apple-watch": { model: "AppleWatch", api: appleWatchAPI },
  "phu-kien": { model: "Accessories", api: accessoryAPI },
};

const VARIANT_KEY_FIELD = {
  iPhone: "storage",
  iPad: "storage",
  Mac: "storage",
  AirPods: "variantName",
  AppleWatch: "variantName",
  Accessories: "variantName",
};

const ProductDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topRef = useRef(null);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const categorySlug = pathParts[0];
  const fullSlug = pathParts.slice(1).join("/");
  const categoryInfo = CATEGORY_MAP[categorySlug];
  const sku = searchParams.get("sku");

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("info");

  const { addToCart, isLoading: cartLoading } = useCartStore();

  const hasHandledDefaultVariant = useRef(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [fullSlug, sku]);

  // Fetch product data from real API
  useEffect(() => {
    const fetchProductData = async () => {
      if (!categoryInfo || !fullSlug) {
        setError("Không tìm thấy sản phẩm");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      hasHandledDefaultVariant.current = false;

      try {
        const response = await categoryInfo.api.get(fullSlug, {
          params: sku ? { sku } : {},
        });

        const data = response.data.data;
        const fetchedProduct = data.product || data;
        const fetchedVariants = data.variants || fetchedProduct.variants || [];

        setProduct(fetchedProduct);
        setVariants(fetchedVariants);

        // Xác định variant được chọn
        let variantToSelect = null;
        if (sku) {
          variantToSelect = fetchedVariants.find((v) => v.sku === sku);
        }
        if (!variantToSelect && fetchedVariants.length > 0) {
          variantToSelect = fetchedVariants[0];
        }

        setSelectedVariant(variantToSelect);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err.response?.data?.message || "Không thể tải sản phẩm");
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [fullSlug, sku, categoryInfo]);

  // Update URL when variant changes
  const handleVariantSelect = (variant) => {
    if (!variant || !variant.slug) return;
    const newUrl = `/${categorySlug}/${variant.slug}?sku=${variant.sku}`;
    navigate(newUrl, { replace: true });
    setSelectedVariant(variant);
    setSelectedImage(0);
  };

  // Add to cart with real API
  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    const result = await addToCart(selectedVariant._id, 1);
    if (result.success) {
      alert("Đã thêm vào giỏ hàng!");
    } else {
      alert(result.message || "Thêm vào giỏ thất bại");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const getDiscountPercent = () => {
    if (!selectedVariant) return 0;
    const { price, originalPrice } = selectedVariant;
    return originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;
  };

  const getGroupedVariants = () => {
    const grouped = {};
    variants.forEach((v) => {
      const color = v.color || "Không rõ";
      if (!grouped[color]) grouped[color] = [];
      grouped[color].push(v);
    });
    return grouped;
  };

  const getVariantKeyOptions = () => {
    if (!product || !selectedVariant) return [];
    const keyField = VARIANT_KEY_FIELD[product.category] || "storage";
    const filtered = variants.filter((v) => v.color === selectedVariant.color);
    return [...new Set(filtered.map((v) => v[keyField]))].sort((a, b) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return aNum - bNum;
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error || !product || !selectedVariant) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">
          {error || "Không tìm thấy sản phẩm"}
        </h2>
      </div>
    );
  }

  const images = selectedVariant?.images || [];
  const discount = getDiscountPercent();
  const groupedVariants = getGroupedVariants();
  const variantKeyOptions = getVariantKeyOptions();
  const keyField = VARIANT_KEY_FIELD[product.category] || "storage";

  return (
    <div ref={topRef} className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="text-sm text-gray-600">
            <span className="hover:text-red-600 cursor-pointer">Trang chủ</span>
            <span className="mx-2">›</span>
            <span className="hover:text-red-600 cursor-pointer">
              {categoryInfo.model}
            </span>
            <span className="mx-2">›</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Image Gallery */}
          <div className="space-y-4">
            <div className="relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden aspect-square">
              <img
                src={images[selectedImage] || "/placeholder.png"}
                alt={product.name}
                className="w-full h-full object-contain p-8"
              />
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                  Giảm {discount}%
                </div>
              )}
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                Free ship toàn quốc
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedImage === idx
                        ? "border-red-600 ring-2 ring-red-200"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  ({product.reviews?.length || 0} đánh giá)
                </span>
              </div>
            </div>

            {/* Variant Selection */}
            <div className="space-y-4">
              {/* Storage / Variant Key */}
              <div>
                <h3 className="font-semibold text-sm mb-2">
                  {keyField === "storage" ? "Dung lượng:" : "Phiên bản:"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {variantKeyOptions.map((option) => {
                    const variant = variants.find(
                      (v) =>
                        v.color === selectedVariant.color &&
                        v[keyField] === option
                    );
                    const isSelected = selectedVariant[keyField] === option;
                    const hasStock = variant?.stock > 0;
                    return (
                      <button
                        key={option}
                        onClick={() => hasStock && handleVariantSelect(variant)}
                        disabled={!hasStock}
                        className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? "border-red-600 bg-red-50 text-red-600"
                            : hasStock
                            ? "border-gray-300 hover:border-red-400"
                            : "border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Màu sắc:</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(groupedVariants).map((color) => {
                    const isSelected = selectedVariant.color === color;
                    const hasStock = groupedVariants[color].some(
                      (v) => v.stock > 0
                    );
                    const availableVariant =
                      groupedVariants[color].find((v) => v.stock > 0) ||
                      groupedVariants[color][0];
                    return (
                      <button
                        key={color}
                        onClick={() =>
                          hasStock && handleVariantSelect(availableVariant)
                        }
                        disabled={!hasStock}
                        className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? "border-red-600 bg-red-50 text-red-600"
                            : hasStock
                            ? "border-gray-300 hover:border-red-400"
                            : "border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-3xl font-bold text-red-600">
                  {formatPrice(selectedVariant.price)}
                </span>
                {selectedVariant.originalPrice > selectedVariant.price && (
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(selectedVariant.originalPrice)}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-red-700">
                  <Gift className="w-4 h-4" />
                  <span className="font-medium">
                    Giảm ngay 500,000đ (đến 31/10)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4" />
                  <span>Combo phụ kiện giảm đến 299,000đ</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4" />
                  <span>Trả góp 0%</span>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={cartLoading || selectedVariant.stock === 0}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {selectedVariant.stock === 0 ? "Hết hàng" : "Mua ngay"}
              </button>
            </div>

            {/* Stock Warning */}
            {selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                <p className="text-sm text-orange-700 font-medium">
                  Chỉ còn {selectedVariant.stock} sản phẩm!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12">
          <div className="flex border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === "info"
                  ? "text-red-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Thông số kỹ thuật
              {activeTab === "info" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("warranty")}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === "warranty"
                  ? "text-red-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Bảo hành & Dịch vụ
              {activeTab === "warranty" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
              )}
            </button>
          </div>

          <div className="py-6">
            {activeTab === "info" && (
              <SpecificationsTab specifications={product.specifications} />
            )}
            {activeTab === "warranty" && <WarrantyTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
