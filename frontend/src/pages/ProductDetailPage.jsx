import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  Star,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Heart,
  Share2,
  Play,
  Package2,
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
import AddToCartModal from "@/components/product/AddToCartModal";
import { ReviewsTab } from "@/components/product/ReviewsTab";
import { Button } from "@/components/ui/button";

const CATEGORY_MAP = {
  "dien-thoai": { model: "iPhone", api: iPhoneAPI, category: "iPhone" },
  "may-tinh-bang": { model: "iPad", api: iPadAPI, category: "iPad" },
  macbook: { model: "Mac", api: macAPI, category: "Mac" },
  "tai-nghe": { model: "AirPods", api: airPodsAPI, category: "AirPods" },
  "apple-watch": {
    model: "AppleWatch",
    api: appleWatchAPI,
    category: "AppleWatch",
  },
  "phu-kien": {
    model: "Accessory",
    api: accessoryAPI,
    category: "Accessory",
  },
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
  const [userSelectedKey, setUserSelectedKey] = useState(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState("variant"); // 'variant' | 'featured' | 'video'

  const { addToCart, isLoading: cartLoading } = useCartStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fullSlug]);

  // Get images based on active media tab
  const getCurrentMainImages = () => {
    if (activeMediaTab === "featured" && product?.featuredImages?.length > 0) {
      return product.featuredImages.filter(Boolean);
    }

    if (activeMediaTab === "video") {
      return [];
    }

    // Default: variant images (logic cũ)
    return selectedVariant?.images?.filter(Boolean) || [];
  };

  useEffect(() => {
    const fetchProductData = async () => {
      if (!categoryInfo || !fullSlug) {
        setError("Không tìm thấy sản phẩm");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const baseSlugMatch = fullSlug.match(/^(.+?)(?:-\d+(?:gb|tb))?$/i);
        const baseSlug = baseSlugMatch ? baseSlugMatch[1] : fullSlug;

        const response = await categoryInfo.api.get(baseSlug, {
          params: sku ? { sku } : {},
        });
        const data = response.data.data;
        const fetchedProduct = data.product || data;
        const fetchedVariants = data.variants || fetchedProduct.variants || [];

        setProduct(fetchedProduct);
        setVariants(fetchedVariants);

        let variantToSelect = null;
        if (sku) {
          variantToSelect = fetchedVariants.find((v) => v.sku === sku);
        }
        if (!variantToSelect && fetchedVariants.length > 0) {
          variantToSelect = fetchedVariants[0];
        }

        if (variantToSelect) {
          setSelectedVariant(variantToSelect);
          const keyField =
            VARIANT_KEY_FIELD[fetchedProduct.category] || "storage";
          setUserSelectedKey(variantToSelect[keyField]);
        }

        // Set default tab to variant
        setActiveMediaTab("variant");
        setSelectedImage(0);

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err.response?.data?.message || "Không thể tải sản phẩm");
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [categorySlug, categoryInfo]);

  const handleVariantSelect = (variant, isColorChange = false) => {
    if (!variant) return;

    const keyField = VARIANT_KEY_FIELD[product.category] || "storage";

    if (!isColorChange) {
      setUserSelectedKey(variant[keyField]);
      const newUrl = `/${categorySlug}/${fullSlug
        .split("-")
        .slice(0, -1)
        .join("-")}-${variant[keyField]
        .toLowerCase()
        .replace(/\s+/g, "")}?sku=${variant.sku}`;
      window.history.replaceState(null, "", newUrl);
      updateVariantUI(variant);
    } else {
      const targetVariant = variants.find(
        (v) => v.color === variant.color && v[keyField] === userSelectedKey
      );
      const finalVariant = targetVariant || variant;
      const baseSlug = fullSlug.split("-").slice(0, -1).join("-");
      const newUrl = `/${categorySlug}/${baseSlug}-${finalVariant[keyField]
        .toLowerCase()
        .replace(/\s+/g, "")}?sku=${finalVariant.sku}`;
      window.history.replaceState(null, "", newUrl);
      updateVariantUI(finalVariant);
    }
  };

  const updateVariantUI = (variant) => {
    const currentImageUrl = selectedVariant?.images?.[selectedImage];
    const newImageIndex = variant.images?.indexOf(currentImageUrl);
    const finalImageIndex = newImageIndex >= 0 ? newImageIndex : 0;
    setSelectedVariant(variant);
    setSelectedImage(finalImageIndex);

    // Reset về tab variant khi đổi màu
    setActiveMediaTab("variant");
  };

  const handleAddToCart = async (redirectToCheckout = false) => {
    if (!selectedVariant || !product) {
      console.error("❌ Missing product or variant");
      return;
    }

    console.log("🛒 Adding to cart:", {
      variantId: selectedVariant._id,
      productCategory: product.category,
      categoryInfo: categoryInfo,
    });

    const productType =
      categoryInfo?.category || categoryInfo?.model || product.category;

    if (!productType) {
      alert("Lỗi: Không xác định được loại sản phẩm");
      console.error("❌ productType is undefined", { product, categoryInfo });
      return;
    }

    if (!selectedVariant._id) {
      alert("Lỗi: Không xác định được variant ID");
      console.error("❌ variantId is undefined", selectedVariant);
      return;
    }

    const result = await addToCart(selectedVariant._id, 1, productType);

    if (result.success) {
      if (redirectToCheckout) {
        navigate(`/cart?select=${selectedVariant._id}`);
      } else {
        setShowAddToCartModal(true);
      }
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
      const parseStorage = (str) => {
        const num = parseInt(str);
        if (str.includes("TB")) return num * 1000;
        return num;
      };
      const aNum = parseStorage(a) || 0;
      const bNum = parseStorage(b) || 0;
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

  const discount = getDiscountPercent();
  const groupedVariants = getGroupedVariants();
  const variantKeyOptions = getVariantKeyOptions();
  const keyField = VARIANT_KEY_FIELD[product.category] || "storage";

  return (
    <div ref={topRef} className="bg-gray-50 min-h-screen">


      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Image Gallery - 7 cols */}
          <div className="lg:col-span-7 h-96">
            <div className="bg-white rounded-lg overflow-hidden sticky top-4">
              {/* Main Image */}
              <div className="relative aspect-video bg-white">
                {" "}
                {/* 16:9 Aspect Ratio */}
                {activeMediaTab === "video" && product.videoUrl ? (
                  // Hiển thị video
                  <div className="w-full h-full p-8">
                    {product.videoUrl.includes("youtube.com") ||
                    product.videoUrl.includes("youtu.be") ? (
                      <iframe
                        src={product.videoUrl.replace("watch?v=", "embed/")}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                        title="Product Video"
                      />
                    ) : (
                      <video
                        src={product.videoUrl}
                        controls
                        className="w-full h-full rounded-lg"
                      />
                    )}
                  </div>
                ) : (
                  // Hiển thị ảnh (featured hoặc variant)
                  <>
                    {(() => {
                      const currentImages = getCurrentMainImages();
                      return currentImages.length > 0 ? (
                        <img
                          src={
                            currentImages[selectedImage] || "/placeholder.png"
                          }
                          alt={product.name}
                          className="w-full h-full object-contain p-8"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          Không có ảnh
                        </div>
                      );
                    })()}

                    {/* Navigation Arrows */}
                    {(() => {
                      const currentImages = getCurrentMainImages();
                      return (
                        currentImages.length > 1 &&
                        activeMediaTab !== "video" && (
                          <>
                            <button
                              onClick={() => {
                                const images = getCurrentMainImages();
                                setSelectedImage((prev) =>
                                  prev > 0 ? prev - 1 : images.length - 1
                                );
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                            >
                              <ChevronLeft className="w-6 h-6 text-gray-700" />
                            </button>
                            <button
                              onClick={() => {
                                const images = getCurrentMainImages();
                                setSelectedImage((prev) =>
                                  prev < images.length - 1 ? prev + 1 : 0
                                );
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                            >
                              <ChevronRight className="w-6 h-6 text-gray-700" />
                            </button>

                            {/* Image Counter */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                              {selectedImage + 1}/{currentImages.length}
                            </div>
                          </>
                        )
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Thumbnail Navigation */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {/* Tab Nổi bật */}
                  {product.featuredImages?.filter(Boolean).length > 0 && (
                    <button
                      onClick={() => {
                        setActiveMediaTab("featured");
                        setSelectedImage(0);
                      }}
                      className={`flex-shrink-0 w-16 h-16 border-2 rounded-lg flex flex-col items-center justify-center transition-all bg-white ${
                        activeMediaTab === "featured"
                          ? "border-red-600 ring-2 ring-red-200"
                          : "border-gray-300 hover:border-red-500"
                      }`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          activeMediaTab === "featured"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-xs mt-1 ${
                          activeMediaTab === "featured"
                            ? "text-red-600 font-semibold"
                            : "text-gray-600"
                        }`}
                      >
                        Nổi bật
                      </span>
                    </button>
                  )}

                  {/* Tab Video */}
                  {product.videoUrl && (
                    <button
                      onClick={() => {
                        setActiveMediaTab("video");
                        setSelectedImage(0);
                      }}
                      className={`flex-shrink-0 w-16 h-16 border-2 rounded-lg flex flex-col items-center justify-center transition-all bg-white ${
                        activeMediaTab === "video"
                          ? "border-red-600 ring-2 ring-red-200"
                          : "border-gray-300 hover:border-red-500"
                      }`}
                    >
                      <Play
                        className={`w-5 h-5 ${
                          activeMediaTab === "video"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-xs mt-1 ${
                          activeMediaTab === "video"
                            ? "text-red-600 font-semibold"
                            : "text-gray-600"
                        }`}
                      >
                        Video
                      </span>
                    </button>
                  )}

                  {/* Image thumbnails của variant */}
                  {(() => {
                    const variantImages =
                      selectedVariant?.images?.filter(Boolean) || [];
                    return variantImages.slice(0, 6).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveMediaTab("variant");
                          setSelectedImage(idx);
                        }}
                        className={`flex-shrink-0 w-16 h-16 border-2 rounded-lg overflow-hidden transition-all ${
                          selectedImage === idx && activeMediaTab === "variant"
                            ? "border-red-600 ring-2 ring-red-200"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-contain p-1"
                        />
                      </button>
                    ));
                  })()}

                  {/* More images indicator */}
                  {(() => {
                    const variantImages =
                      selectedVariant?.images?.filter(Boolean) || [];
                    return (
                      variantImages.length > 6 && (
                        <button
                          onClick={() => setActiveMediaTab("variant")}
                          className="flex-shrink-0 w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white hover:border-red-500 transition-all"
                        >
                          <span className="text-sm font-semibold text-gray-600">
                            +{variantImages.length - 6}
                          </span>
                        </button>
                      )
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Info - 5 cols */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-lg p-6">
              {/* Product Title & Meta */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">
                      {product.averageRating.toFixed(1)}
                    </span>
                    <span className="text-gray-600">
                      {product.totalReviews} đánh giá
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Selection */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-3">
                  {keyField === "storage" ? "Dung lượng" : "Phiên bản"}
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
                        onClick={() =>
                          hasStock && handleVariantSelect(variant, false)
                        }
                        disabled={!hasStock}
                        className={`relative px-6 py-3 border-2 rounded-lg font-medium transition-all ${
                          isSelected
                            ? "border-red-600 bg-red-50 text-red-600"
                            : hasStock
                            ? "border-gray-300 hover:border-red-400"
                            : "border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                        }`}
                      >
                        {option}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Màu sắc</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(groupedVariants).map((color) => {
                    const isSelected = selectedVariant.color === color;
                    const hasStock = groupedVariants[color].some(
                      (v) => v.stock > 0
                    );
                    const preferredVariant = groupedVariants[color].find(
                      (v) => v[keyField] === userSelectedKey && v.stock > 0
                    );
                    const availableVariant =
                      preferredVariant ||
                      groupedVariants[color].find((v) => v.stock > 0) ||
                      groupedVariants[color][0];

                    const sampleImage = availableVariant?.images?.[0];

                    return (
                      <button
                        key={color}
                        onClick={() =>
                          hasStock &&
                          handleVariantSelect(availableVariant, true)
                        }
                        disabled={!hasStock}
                        className={`relative flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                          isSelected
                            ? "border-red-600 bg-red-50"
                            : hasStock
                            ? "border-gray-300 hover:border-red-400"
                            : "border-gray-200 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {/* Color Image */}
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {sampleImage && (
                            <img
                              src={sampleImage}
                              alt={color}
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        {/* Color Name */}
                        <span
                          className={`text-sm font-medium flex-1 text-left ${
                            isSelected ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {color}
                        </span>
                        {/* Check Mark */}
                        {isSelected && (
                          <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Section */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 mb-6 border border-red-100">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-3xl font-bold text-red-600">
                    {formatPrice(selectedVariant.price)}
                  </span>
                  {selectedVariant.originalPrice > selectedVariant.price && (
                    <>
                      <span className="text-lg text-gray-500 line-through">
                        {formatPrice(selectedVariant.originalPrice)}
                      </span>
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-sm font-semibold">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Promotion Box */}
              <div className="bg-pink-50 rounded-xl p-4 mb-6 border border-pink-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    🔥 Khuyến mãi đặc biệt
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>Giảm ngay 2.800.000đ áp dụng đến 06/11</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>AirPods giảm đến 500.000đ khi mua kèm iPhone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>
                      Giảm thêm đến 2.5 triệu khi mua kèm SIM FPT
                      FVIP150/F299/F399 6-12 tháng{" "}
                      <button className="text-blue-600 hover:underline">
                        Xem chi tiết
                      </button>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>Trả góp 0%</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleAddToCart(false)}
                  disabled={cartLoading || selectedVariant.stock === 0}
                  className="flex-1 bg-white hover:bg-gray-50 text-red-600 font-bold py-4 px-6 rounded-lg text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-red-600 shadow-lg hover:shadow-xl"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartLoading ? "Đang thêm..." : "Thêm vào giỏ"}
                </button>

                <button
                  onClick={() => handleAddToCart(true)}
                  disabled={cartLoading || selectedVariant.stock === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {selectedVariant.stock === 0 ? "Hết hàng" : "Mua ngay"}
                </button>
              </div>

              {/* Stock Warning */}
              {selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded mb-4">
                  <p className="text-sm text-orange-700 font-medium">
                    ⚠️ Chỉ còn {selectedVariant.stock} sản phẩm!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-8 bg-white rounded-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 px-6 py-4 font-semibold transition-all relative ${
                activeTab === "info"
                  ? "text-red-600 bg-red-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Thông số kỹ thuật
              {activeTab === "info" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("warranty")}
              className={`flex-1 px-6 py-4 font-semibold transition-all relative ${
                activeTab === "warranty"
                  ? "text-red-600 bg-red-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Chính sách & Bảo hành
              {activeTab === "warranty" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
              )}
            </button>

            {/* <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 px-6 py-4 font-semibold transition-all relative ${
                activeTab === "reviews"
                  ? "text-red-600 bg-red-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Đánh giá ({product.totalReviews || 0})
              {activeTab === "reviews" && (
                <ReviewsTab productId={product._id} product={product} />
              )}
            </button> */}
          </div>

          <div className="p-6">
            {activeTab === "info" && (
              <SpecificationsTab specifications={product.specifications} />
            )}
            {activeTab === "warranty" && <WarrantyTab />}
          </div>
        </div>
      </div>

      {/* Reviews Section - Độc lập */}
      <div className="mt-8 bg-white rounded-lg p-8 px-24">
        <h2 className="text-2xl font-bold mb-6">Đánh giá sản phẩm</h2>
        <ReviewsTab productId={product._id} product={product} />
      </div>

      {/* Add to Cart Modal */}
      <AddToCartModal
        isOpen={showAddToCartModal}
        onClose={() => setShowAddToCartModal(false)}
        product={product}
        variant={selectedVariant}
      />
    </div>
  );
};

export default ProductDetailPage;
