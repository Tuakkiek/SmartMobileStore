// ============================================
// FILE: frontend/src/pages/ProductDetailPage.jsx
// ✅ REDESIGNED: Theo ảnh mẫu iPhone Air 256GB
// ✅ UPDATED: Support new URL structure /:category/:slug?sku=xxx
// ✅ FIXED: Handle variant selection and display
// ============================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, ShoppingCart, Shield, Truck, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { iPhoneAPI, iPadAPI, macAPI, airPodsAPI, appleWatchAPI, accessoryAPI } from "@/lib/api";

// Ánh xạ category path thành Model name
const CATEGORY_MAP = {
  "dien-thoai": "iPhone",
  "may-tinh-bang": "iPad",
  macbook: "Mac",
  "apple-watch": "AppleWatch",
  "tai-nghe": "AirPods",
  "phu-kien": "Accessories",
};

// Variant key field per category
const VARIANT_KEY_FIELD = {
  iPhone: "storage",
  iPad: "storage",
  Mac: "storage",
  AirPods: "variantName",
  AppleWatch: "variantName",
  Accessories: "variantName",
};

const ProductDetailPage = () => {
  const { category, slug } = useParams(); // :category/:slug
  const [searchParams, setSearchParams] = useSearchParams();
  const sku = searchParams.get("sku");
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH PRODUCT DATA
  // ============================================
  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      setError(null);

      const modelName = CATEGORY_MAP[category]; // e.g., "iPhone"
      if (!modelName) {
        setError("Danh mục sản phẩm không hợp lệ.");
        setIsLoading(false);
        return;
      }

      // 1. CHỌN ĐÚNG API DỰA TRÊN CATEGORY
      const API_MAP = {
        iPhone: iPhoneAPI,
        iPad: iPadAPI,
        Mac: macAPI,
        AirPods: airPodsAPI,
        AppleWatch: appleWatchAPI,
        Accessories: accessoryAPI,
      };
      
      const categoryAPI = API_MAP[modelName];
      if (!categoryAPI || !categoryAPI.get) {
          setError("Không tìm thấy API cho danh mục sản phẩm này.");
          setIsLoading(false);
          return;
      }

      // 2. TẠO SLUG THEO FORMAT
      const urlPath = slug; 
      
      try {
        // Gọi API riêng của category
        const response = await categoryAPI.get(urlPath, { params: { sku: sku || "" } });
        
        if (!response?.data?.success) {
          // Có thể backend trả về 404/400 nếu không tìm thấy
          throw new Error(response.data.message || "Không tìm thấy sản phẩm");
        }

        const productData = response.data.data.product || response.data.product;
        setProduct(productData);

        // Lấy danh sách variants
        const variantsList = Array.isArray(productData.variants) ? productData.variants : [];
        setVariants(variantsList);

        // Chọn variant dựa trên sku hoặc default
        let selectedVar = variantsList.find((v) => v.sku === sku) ||
                         (variantsList.find((v) => v.stock > 0) || variantsList[0] || null);
        setSelectedVariant(selectedVar);

        // Nếu không có sku trong URL nhưng có selectedVar, thêm vào URL
        if (!sku && selectedVar) {
          searchParams.set("sku", selectedVar.sku);
          setSearchParams(searchParams, { replace: true });
        }
      } catch (error) {
          console.error("Error fetching product:", error);
          setError("Lỗi khi tải thông tin sản phẩm");
          toast.error(error.message || "Lỗi khi tải thông tin sản phẩm");
          navigate("/");
      } finally {
          setIsLoading(false);
      }
    };

    if (category && slug) {
      fetchProductData();
    }
  }, [category, slug, sku, navigate, setSearchParams]);

  // ============================================
  // HANDLE VARIANT SELECTION
  // ============================================
  const handleVariantSelect = (variant) => {
    if (!variant) return;

    // Cập nhật query string với sku mới
    searchParams.set("sku", variant.sku);
    setSearchParams(searchParams, { replace: true });

    setSelectedVariant(variant);
    setSelectedImage(0);
  };

  // ============================================
  // HANDLE ADD TO CART
  // ============================================
  const handleAddToCart = async () => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      toast.error("Vui lòng chọn phiên bản sản phẩm");
      return;
    }

    if (selectedVariant.stock <= 0) {
      toast.error("Sản phẩm tạm hết hàng");
      return;
    }

    setIsAddingToCart(true);
    try {
      const result = await addToCart(selectedVariant._id, 1);
      if (result.success) {
        toast.success("Đã thêm vào giỏ hàng", {
          description: `${product.name} • ${getVariantLabel(selectedVariant)}`,
        });
        navigate("/cart");
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Không thể thêm vào giỏ hàng");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getVariantLabel = (variant) => {
    if (!variant) return "";
    const cat = product?.category;

    if (cat === "iPhone") {
      return variant.storage;
    } else if (cat === "iPad") {
      return `${variant.storage} ${variant.connectivity}`;
    } else if (cat === "Mac") {
      return `${variant.cpuGpu} • ${variant.ram} • ${variant.storage}`;
    } else {
      return variant.variantName || variant.storage || "";
    }
  };

  const getGroupedVariants = () => {
    const grouped = {};
    variants.forEach((variant) => {
      const color = variant.color || "Unknown";
      if (!grouped[color]) {
        grouped[color] = [];
      }
      grouped[color].push(variant);
    });
    return grouped;
  };

  const getCurrentImages = () => {
    if (selectedVariant?.images?.length > 0) {
      return selectedVariant.images;
    }
    return product?.images || [];
  };

  const getVariantKeyOptions = () => {
    const cat = product?.category;
    const keyField = VARIANT_KEY_FIELD[cat] || "storage";
    const filtered = variants.filter(
      (v) => v.color === selectedVariant?.color
    );
    return [...new Set(filtered.map((v) => v[keyField]))].sort((a, b) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return aNum - bNum;
    });
  };

  const getDiscountPercent = () => {
    if (!selectedVariant) return 0;
    const { price, originalPrice } = selectedVariant;
    if (originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    return 0;
  };

  // ============================================
  // RENDER LOADING/ERROR STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !product || !selectedVariant) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{error || "Không tìm thấy sản phẩm"}</h2>
          <Button onClick={() => navigate("/")}>Quay lại trang chủ</Button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  const images = getCurrentImages();
  const discount = getDiscountPercent();
  const groupedVariants = getGroupedVariants();
  const variantKeyOptions = getVariantKeyOptions();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* BREADCRUMB */}
      <div className="text-sm text-gray-500 mb-6">
        <span
          className="hover:text-gray-700 cursor-pointer"
          onClick={() => navigate("/")}
        >
          Trang chủ
        </span>
        <span className="mx-2">/</span>
        <span
          className="hover:text-gray-700 cursor-pointer"
          onClick={() => navigate(`/products?category=${product.category}`)}
        >
          {product.category}
        </span>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: IMAGE GALLERY */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
            <img
              src={images[selectedImage] || "/placeholder.png"}
              alt={product.name}
              className="w-full h-full object-contain p-8"
            />
            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-600 hover:bg-red-600 text-white font-bold text-sm px-3 py-1">
                -{discount}%
              </Badge>
            )}
          </div>

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square bg-gray-50 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedImage === idx
                      ? "border-blue-600"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: PRODUCT INFO */}
        <div className="space-y-6">
          {/* Product Name */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            {product.averageRating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(product.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({product.totalReviews || 0} đánh giá)
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-baseline gap-3">
              {selectedVariant.originalPrice > selectedVariant.price && (
                <span className="text-lg text-gray-500 line-through">
                  {formatPrice(selectedVariant.originalPrice)}
                </span>
              )}
              <span className="text-4xl font-bold text-red-600">
                {formatPrice(selectedVariant.price)}
              </span>
            </div>

            {/* Installment Badge */}
            {product.installmentBadge &&
              product.installmentBadge !== "NONE" && (
                <Badge
                  variant="outline"
                  className="mt-3 bg-gray-200 text-gray-700 border-0"
                >
                  {product.installmentBadge}
                </Badge>
              )}
          </div>

          <Separator />

          {/* Color Selection */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Màu sắc</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(groupedVariants).map((color) => {
                const isSelected = selectedVariant?.color === color;
                const hasStock = groupedVariants[color].some(
                  (v) => v.stock > 0
                );

                return (
                  <Button
                    key={color}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    disabled={!hasStock}
                    onClick={() =>
                      handleVariantSelect(
                        groupedVariants[color].find((v) => v.stock > 0) ||
                          groupedVariants[color][0]
                      )
                    }
                    className={`px-4 py-2 rounded-full ${
                      isSelected
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "hover:border-gray-500"
                    } ${!hasStock && "opacity-50 cursor-not-allowed"}`}
                  >
                    {color}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Variant Key Selection (storage/variantName) */}
          {variantKeyOptions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Phiên bản</h3>
              <div className="flex flex-wrap gap-2">
                {variantKeyOptions.map((keyValue) => {
                  const variant = variants.find(
                    (v) =>
                      v.color === selectedVariant?.color &&
                      v[VARIANT_KEY_FIELD[product.category]] === keyValue
                  );
                  const isSelected = selectedVariant?.[VARIANT_KEY_FIELD[product.category]] === keyValue;
                  const hasStock = variant?.stock > 0;

                  return (
                    <Button
                      key={keyValue}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      disabled={!hasStock}
                      onClick={() => handleVariantSelect(variant)}
                      className={`px-4 py-2 rounded-full ${
                        isSelected
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "hover:border-gray-500"
                      } ${!hasStock && "opacity-50 cursor-not-allowed"}`}
                    >
                      {keyValue}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Status */}
          {selectedVariant.stock <= 5 && selectedVariant.stock > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-600 font-medium">
                ⚠️ Chỉ còn {selectedVariant.stock} sản phẩm!
              </p>
            </div>
          )}

          {selectedVariant.stock === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600 font-medium">
                ❌ Sản phẩm tạm hết hàng
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg rounded-xl"
              onClick={handleAddToCart}
              disabled={isAddingToCart || selectedVariant.stock === 0}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
            </Button>
          </div>

          <Separator />

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium">Bảo hành 12 tháng</p>
                <p className="text-sm text-gray-600">
                  Bảo hành chính hãng 1 năm tại Apple
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium">Miễn phí vận chuyển</p>
                <p className="text-sm text-gray-600">
                  Giao hàng toàn quốc, thanh toán khi nhận hàng
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium">Đổi trả trong 30 ngày</p>
                <p className="text-sm text-gray-600">
                  Hoàn tiền 100% nếu có lỗi từ nhà sản xuất
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SPECIFICATIONS SECTION */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Thông số kỹ thuật</h2>
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {product.specifications &&
              Object.entries(product.specifications).map(([key, value]) => {
                if (
                  key === "colors" ||
                  !value ||
                  (Array.isArray(value) && value.length === 0)
                )
                  return null;

                const label =
                  {
                    chip: "Chip xử lý",
                    ram: "RAM",
                    storage: "Bộ nhớ trong",
                    frontCamera: "Camera trước",
                    rearCamera: "Camera sau",
                    screenSize: "Kích thước màn hình",
                    screenTech: "Công nghệ màn hình",
                    battery: "Pin",
                    os: "Hệ điều hành",
                    gpu: "GPU",
                    screenResolution: "Độ phân giải",
                    brand: "Thương hiệu",
                    batteryLife: "Thời lượng pin",
                    waterResistance: "Chống nước",
                    bluetooth: "Bluetooth",
                    connectivity: "Kết nối",
                  }[key] || key;

                return (
                  <div key={key} className="flex py-3 border-b">
                    <span className="font-medium text-gray-700 w-1/2">
                      {label}:
                    </span>
                    <span className="text-gray-900 w-1/2">
                      {Array.isArray(value) ? value.join(", ") : value}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* DESCRIPTION */}
      {product.description && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Mô tả sản phẩm</h2>
          <Card className="p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;