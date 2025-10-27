// frontend/src/components/shared/ProductCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const ProductCard = ({ product, isTopNew = false, isTopSeller = false }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);

  // Lấy variant đầu tiên có stock > 0 để hiển thị
  const availableVariant = product.variants?.find((v) => v.stock > 0);
  const displayVariant = availableVariant || product.variants?.[0];

  const displayPrice = displayVariant?.price || 0;
  const displayOriginalPrice = displayVariant?.originalPrice || 0;
  const displayImage = displayVariant?.images?.[0];
  const totalStock =
    product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;

  // Tính % giảm giá
  const discountPercent =
    displayOriginalPrice > displayPrice
      ? Math.round(
          ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
        )
      : 0;

  // Xác định badge ưu tiên
  const getPriorityBadge = () => {
    if (isTopNew) return { text: "Mới", color: "bg-green-500 text-white" };
    if (isTopSeller)
      return { text: "Bán chạy", color: "bg-yellow-600 text-white" };
    if (product.installmentBadge === "INSTALLMENT_0_PREPAY_0")
      return {
        text: "Trả góp 0% trả trước 0đ",
        color: "bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs",
      };
    if (product.installmentBadge === "INSTALLMENT_0")
      return { text: "Trả góp 0%", color: "bg-blue-500 text-white" };
    return null;
  };

  const badge = getPriorityBadge();

  // Lấy danh sách dung lượng duy nhất từ tất cả variants
  const storageOptions = [
    ...new Set(
      product.variants
        ?.filter((v) => v.stock > 0)
        .map((v) => v.storage)
        .sort((a, b) => {
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          return aNum - bNum;
        })
    ),
  ];

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      navigate("/login");
      return;
    }
    if (totalStock === 0) {
      toast.error("Sản phẩm tạm hết hàng");
      return;
    }

    const variantToAdd = availableVariant || product.variants[0];
    setIsAdding(true);
    try {
      const result = await addToCart(variantToAdd._id, 1);
      if (result.success) {
        toast.success("Đã thêm vào giỏ hàng", {
          description: `${product.name} • ${variantToAdd.color} ${variantToAdd.storage}`,
        });
      }
    } catch (err) {
      toast.error("Không thể thêm vào giỏ hàng");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card
      className="w-full max-w-[280px] mx-auto overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group bg-white border-0"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-20">
        {discountPercent > 0 && (
          <Badge className="bg-red-500 text-white font-bold text-sm px-3 py-1 rounded-full shadow-md">
            -{discountPercent}%
          </Badge>
        )}
      </div>

      <div className="absolute top-3 right-3 z-20">
        {badge && (
          <Badge
            className={`${badge.color} font-bold text-sm px-3 py-1 rounded-md shadow-md`}
          >
            {badge.text}
          </Badge>
        )}
      </div>

      {/* Image */}
      <div className="relative aspect-[3/4] bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-6xl">Phone</span>
          </div>
        )}

        {/* Add to Cart Button */}
        {isAuthenticated && user?.role === "CUSTOMER" && totalStock > 0 && (
          <Button
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            {isAdding ? "..." : "Thêm"}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 bg-white">
        {/* Title */}
        <h3 className="font-bold text-lg line-clamp-2 text-gray-900 leading-tight">
          {product.name}
        </h3>

        {/* Installment Text */}
        {product.installmentBadge?.includes("INSTALLMENT") && (
          <p className="text-xs text-gray-600">
            {product.installmentBadge === "INSTALLMENT_0_PREPAY_0"
              ? "Trả góp 0% trả trước 0đ"
              : "Trả góp 0%"}
          </p>
        )}

        {/* Price */}
        <div className="space-y-1">
          {displayOriginalPrice > displayPrice && (
            <p className="text-sm text-gray-500 line-through">
              {formatPrice(displayOriginalPrice)}
            </p>
          )}
          <p className="text-2xl font-bold text-red-600">
            {formatPrice(displayPrice)}
          </p>
        </div>

        {/* Rating */}
        {product.totalReviews > 0 && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(product.averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              ({product.totalReviews} đánh giá)
            </span>
          </div>
        )}

        {/* Storage Buttons */}
        {storageOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {storageOptions.map((storage) => (
              <button
                key={storage}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                  displayVariant?.storage === storage
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  const variant = product.variants.find(
                    (v) => v.storage === storage && v.stock > 0
                  );
                  if (variant) {
                    // Có thể mở modal chọn màu + dung lượng ở đây
                    navigate(`/products/${product._id}`);
                  }
                }}
              >
                {storage}
              </button>
            ))}
          </div>
        )}

        {/* Stock Warning */}
        {totalStock <= 5 && totalStock > 0 && (
          <p className="text-xs text-orange-600 font-medium">
            Chỉ còn {totalStock} sản phẩm!
          </p>
        )}
        {totalStock === 0 && (
          <p className="text-xs text-red-600 font-medium">Hết hàng</p>
        )}
      </div>
    </Card>
  );
};

export default ProductCard;
