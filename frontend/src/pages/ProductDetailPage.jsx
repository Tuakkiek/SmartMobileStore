// ============================================
// FILE: src/pages/ProductDetailPage.jsx
// ✅ TÍCH HỢP ProductVariantSelector + VARIANT API
// ============================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ShoppingCart, Star, Shield, Clock, Truck, Check } from "lucide-react";
import { productAPI, reviewAPI } from "@/lib/api";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
// ✅ NEW: Import ProductVariantSelector
import ProductVariantSelector from "@/components/ui/ProductVariantSelector";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // ✅ NEW: State cho selected variant
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedWarranty, setSelectedWarranty] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ✅ UPDATED: Fetch product + variants riêng biệt
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Lấy product info
        const productRes = await productAPI.getById(id);
        const p = productRes.data.data.product;
        
        // Chuẩn hóa specifications
        if (p && p.specifications) {
          const s = p.specifications || {};
          p.specifications = {
            screenSize: s.screenSize || s.screen || "",
            cpu: s.cpu || s.chip || "",
            operatingSystem: s.operatingSystem || s.os || "",
            storage: s.storage || "",
            ram: s.ram || "",
            mainCamera: s.mainCamera || s.camera || "",
            frontCamera: s.frontCamera || "",
            colors: Array.isArray(s.colors)
              ? s.colors
              : s.color
              ? [s.color]
              : [],
            resolution: s.resolution || "",
            manufacturer: s.manufacturer || "",
            condition: s.condition || "",
            battery: s.battery || "",
            weight: s.weight || "",
            dimensions: s.dimensions || "",
          };
        }

        setProduct(p);

        // ✅ Lấy variants riêng biệt
        const variantsRes = await productAPI.getVariants(id);
        const variants = variantsRes.data.data.variants;

        // Set default variant (first available)
        const defaultVariant = variants.find(v => v.stock > 0) || variants[0];
        if (defaultVariant) {
          setSelectedVariant(defaultVariant);
        }

        // Lấy reviews
        try {
          const reviewsRes = await reviewAPI.getByProduct(id);
          setReviews(reviewsRes.data.data.reviews || []);
        } catch (reviewError) {
          console.warn("Không thể lấy đánh giá:", reviewError);
          setReviews([]);
        }
      } catch (error) {
        console.error("Lỗi khi lấy sản phẩm:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ✅ UPDATED: Callback từ ProductVariantSelector
  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
  };

  // ✅ UPDATED: Add to cart với variantId
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role !== "CUSTOMER") {
      toast.error("Chỉ khách hàng mới có thể thêm vào giỏ hàng");
      return;
    }

    if (!selectedVariant) {
      toast.error("Vui lòng chọn phiên bản sản phẩm");
      return;
    }

    const result = await addToCart(
      selectedVariant._id, // ✅ VARIANT ID thay vì product ID
      1
    );

    if (result.success) {
      toast.success("Đã thêm vào giỏ hàng", {
        description: `${product.name} • ${selectedVariant.color} • ${selectedVariant.storage}`,
      });
    } else {
      toast.error(result.message || "Thêm vào giỏ hàng thất bại");
    }
  };

  if (isLoading || !product) return <Loading />;

  // ✅ Tính giá cuối cùng với warranty
  const basePrice = selectedVariant?.price || product.price;
  const finalPrice = basePrice + (selectedWarranty?.extraPrice || 0);
  const originalPrice = selectedVariant?.originalPrice || product.originalPrice;

  const warrantyOptions = [
    { label: "1 đổi 1 12 tháng", months: 12, extraPrice: 0 },
    { label: "1 đổi 1 24 tháng", months: 24, extraPrice: 1100000 },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Cột trái: Ảnh + Thông số */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ảnh chính - DÙNG selectedVariant.images */}
            <Card className="overflow-hidden">
              <CardContent className="p-6 bg-white">
                <img
                  src={
                    selectedVariant?.images?.[0] || 
                    product.images?.[0] || 
                    "/placeholder.png"
                  }
                  alt={`${product.name} ${selectedVariant?.color}`}
                  className="w-full h-auto max-h-[400px] object-contain"
                />
              </CardContent>
            </Card>

            {/* Thumbnail images từ selectedVariant */}
            {(selectedVariant?.images?.length > 1 || product.images?.length > 1) && (
              <div className="grid grid-cols-7 gap-2">
                {[
                  ...(selectedVariant?.images || []),
                  ...product.images
                ].slice(0, 7).map((image, index) => (
                  <button
                    key={index}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      index === 0 ? "border-red-500" : "border-gray-200"
                    } hover:border-red-500 transition`}
                    onClick={() => {/* Có thể thêm logic thumbnail */}}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Thông số kỹ thuật */}
            {product.specifications && (
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-bold">Thông số kỹ thuật</h3>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2 text-sm">
                    {Object.entries(product.specifications).map(([key, value]) => 
                      value && (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cột phải: Chi tiết */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tên + Status */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <h1 className="text-2xl font-bold flex-1">{product.name}</h1>
                  <Badge className={getStatusColor(product.status)}>
                    {getStatusText(product.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.averageRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span>({reviews.length} đánh giá)</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-600">
                    Mới 100%
                  </Badge>
                </div>
                {product.model && (
                  <p className="text-gray-600 mb-2">
                    <strong>Mã sản phẩm:</strong> {product.model}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ✅ PRODUCTVARIANTSELECTOR - THAY THẾ STORAGE + COLOR */}
            <ProductVariantSelector
              variants={productAPI.getVariants(id).data?.data?.variants || []}
              onVariantChange={handleVariantChange}
              selectedVariant={selectedVariant}
            />

            {/* Giá - DÙNG selectedVariant.price */}
            <Card className="border-2 border-red-500">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-red-600">
                      {formatPrice(finalPrice)} đ
                    </span>
                    {originalPrice > finalPrice && (
                      <>
                        <span className="text-lg text-gray-400 line-through">
                          {formatPrice(originalPrice)} đ
                        </span>
                        <Badge className="bg-yellow-400 text-yellow-900">
                          Trả góp 0%
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    <strong>Phiên bản:</strong> {selectedVariant?.color} • {selectedVariant?.storage}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Ưu đãi:</strong> Miễn phí vận chuyển toàn quốc
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bảo hành */}
            <Card className="border-2 border-red-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold">Bảo hành</h3>
                </div>
                <div className="space-y-2">
                  {warrantyOptions.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between gap-3 border-2 rounded-lg p-4 cursor-pointer transition ${
                        selectedWarranty?.label === opt.label
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-red-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="radio"
                          name="warranty"
                          checked={selectedWarranty?.label === opt.label}
                          onChange={() => setSelectedWarranty(opt)}
                          className="w-4 h-4 text-red-500"
                        />
                        <span className="font-medium">{opt.label}</span>
                      </div>
                      <div className={`text-sm font-semibold ${
                        opt.extraPrice > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {opt.extraPrice > 0 ? `+ ${formatPrice(opt.extraPrice)}` : "Miễn phí"}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Giao hàng */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Giao hàng</h3>
                </div>
                <p className="text-gray-600">
                  Giao hàng toàn quốc, miễn phí vận chuyển cho đơn hàng từ 500.000đ
                </p>
              </CardContent>
            </Card>

            {/* ✅ BUTTON - DISABLE nếu !selectedVariant */}
            <div className="relative bg-white border-t pt-4">
              <Button
                className="w-full h-14 text-lg font-semibold bg-red-500 hover:bg-red-600"
                onClick={handleAddToCart}
                disabled={!selectedVariant || product.status !== "AVAILABLE"}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {selectedVariant ? "Thêm vào giỏ hàng" : "Chọn phiên bản"}
              </Button>
            </div>
          </div>
        </div>

        {/* Mô tả + Reviews - GIỮ NGUYÊN */}
        <div className="mt-8 grid grid-cols-1 gap-6">
          {product.description && (
            <Card>
              <CardHeader><h3 className="text-xl font-bold">Mô tả sản phẩm</h3></CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
              </CardContent>
            </Card>
          )}
          {reviews.length > 0 && (
            <Card>
              <CardHeader><h3 className="text-xl font-bold">Đánh giá ({reviews.length})</h3></CardHeader>
              <CardContent className="p-6">
                {reviews.map((review, idx) => (
                  <div key={idx} className="border-b py-4 last:border-b-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{review.user?.name || "Ẩn danh"}</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${
                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;