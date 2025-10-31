// ============================================
// FILE: frontend/src/components/shared/ProductCard.jsx
// ✅ FIXED: Use variant.slug instead of generating slug
// ============================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Edit2, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Variant key field per category
const VARIANT_KEY_FIELD = {
  iPhone: "storage",
  iPad: "storage",
  Mac: "storage",
  AirPods: "variantName",
  AppleWatch: "variantName",
  Accessories: "variantName",
};

// Helper component for Star Rating
const StarRating = ({ rating, reviewCount = 0 }) => {
  const roundedRating = Math.round(rating);
  const totalReviewsText = `(${reviewCount || 0} đánh giá)`;

  return (
    <div className="flex items-center gap-[1px]">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < roundedRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{totalReviewsText}</span>
    </div>
  );
};

const ProductCard = ({
  product,
  isTopNew = false,
  isTopSeller = false,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isVariantReady, setIsVariantReady] = useState(false);

  const isAdmin = user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

  // Ensure variants is always an array
  const safeVariants = Array.isArray(product?.variants) ? product.variants : [];

  // === 1. Chọn variant mặc định ===
  useEffect(() => {
    if (!safeVariants.length) {
      setSelectedVariant(null);
      setIsVariantReady(false);
      return;
    }

    // ✅ Ưu tiên: stock > 0 + có sku + có slug
    let variant = safeVariants.find((v) => v.stock > 0 && v.sku && v.slug);
    if (!variant) variant = safeVariants.find((v) => v.sku && v.slug); // có sku + slug dù hết hàng
    if (!variant) variant = safeVariants.find((v) => v.sku); // chỉ có sku (sẽ dùng baseSlug)
    if (!variant) variant = safeVariants[0]; // fallback

    setSelectedVariant(variant);
    // ✅ Sẵn sàng nếu có (SKU + slug) HOẶC (SKU + baseSlug)
    setIsVariantReady(!!(variant?.sku && (variant?.slug || product.baseSlug)));

    // DEBUG LOG
    console.log("ProductCard DEBUG:", {
      name: product.name,
      baseSlug: product.baseSlug,
      variantsCount: safeVariants.length,
      selectedSKU: variant?.sku,
      selectedSlug: variant?.slug,
      hasBaseSlug: !!product.baseSlug,
      isReady: !!(variant?.sku && (variant?.slug || product.baseSlug)),
    });
  }, [product.variants, product.baseSlug, product.name, safeVariants]);

  const current = selectedVariant || {};
  const displayPrice = current.price || product.price || 0;
  const displayOriginalPrice =
    current.originalPrice || product.originalPrice || 0;
  const rating = product.averageRating || 0;
  const reviewCount = product.reviewCount || 0;

  // === 2. Ảnh hiển thị ===
  const displayImage =
    current?.images?.[0] ||
    (Array.isArray(product.images) ? product.images[0] : null) ||
    product.image ||
    "/placeholder.png";

  // === 3. % GIẢM GIÁ ===
  const discountPercent =
    displayOriginalPrice > displayPrice
      ? Math.round(
          ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
        )
      : 0;

  // === 4. BADGE GÓC TRÊN BÊN PHẢI ===
  const getRightBadge = () => {
    if (isTopNew) {
      return {
        text: "Mới",
        color: "bg-green-500 hover:bg-green-500 text-white",
      };
    }
    if (isTopSeller) {
      return {
        text: "Bán chạy",
        color: "bg-green-500 hover:bg-green-500 text-white",
      };
    }
    return null;
  };
  const rightBadge = getRightBadge();

  // === 5. Installment TEXT ===
  const installmentText =
    product.installmentBadge &&
    product.installmentBadge.toLowerCase() !== "none"
      ? product.installmentBadge
      : null;

  // === 6. Danh sách variant key options ===
  const keyField = VARIANT_KEY_FIELD[product.category] || "variantName";
  const variantKeyOptions = Array.from(
    new Set(
      safeVariants
        .filter((v) => v && v[keyField])
        .map((v) => v[keyField])
        .sort((a, b) => {
          const aNum = parseInt(a) || 0;
          const bNum = parseInt(b) || 0;
          return aNum - bNum;
        })
    )
  );

  // === 7. Tổng stock ===
  const totalStock = safeVariants.reduce((sum, v) => sum + (v?.stock || 0), 0);

  // === 8. Chọn variant key ===
  const handleVariantKeyClick = (e, keyValue) => {
    e.stopPropagation();
    let variant = safeVariants.find(
      (v) => v[keyField] === keyValue && v.stock > 0 && v.slug
    );
    if (!variant) {
      variant = safeVariants.find((v) => v[keyField] === keyValue && v.slug);
    }
    if (variant) {
      setSelectedVariant(variant);
      setIsVariantReady(!!(variant.sku && variant.slug));
    }
  };

  // === 9. Thêm vào giỏ hàng ===
  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    if (!selectedVariant || selectedVariant.stock <= 0) {
      toast.error("Sản phẩm tạm hết hàng");
      return;
    }

    setIsAdding(true);
    try {
      const result = await addToCart(selectedVariant._id, 1);
      if (result.success) {
        toast.success("Đã thêm vào giỏ hàng", {
          description: `${product.name} • ${getVariantLabel(selectedVariant)}`,
        });
      }
    } catch {
      toast.error("Không thể thêm vào giỏ hàng");
    } finally {
      setIsAdding(false);
    }
  };

  // === 10. Admin actions ===
  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.(product);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete?.(product._id);
    setShowDeleteDialog(false);
  };

  // === 11. Navigate - Hỗ trợ cả baseSlug và variant slug ===
  const handleCardClick = () => {
    if (isAdmin) return;

    const categoryPath = {
      iPhone: "dien-thoai",
      iPad: "may-tinh-bang",
      Mac: "macbook",
      AppleWatch: "apple-watch",
      AirPods: "tai-nghe",
      Accessories: "phu-kien",
    }[product.category];

    if (!categoryPath) {
      console.warn("Unknown category:", product.category);
      return;
    }

    // ✅ Ưu tiên: Dùng variant.slug nếu có
    if (selectedVariant?.sku && selectedVariant?.slug) {
      const url = `/${categoryPath}/${selectedVariant.slug}?sku=${selectedVariant.sku}`;
      console.log("✅ Navigating to variant slug:", url);
      navigate(url);
      return;
    }

    // ✅ Fallback: Dùng baseSlug (sẽ redirect đến variant đầu tiên)
    if (product.baseSlug) {
      const url = `/${categoryPath}/${product.baseSlug}`;
      console.log("✅ Navigating to baseSlug (will redirect):", url);
      navigate(url);
      return;
    }

    // ❌ Không có slug nào
    console.warn("Cannot navigate: no slug available", {
      product,
      selectedVariant,
    });
    toast.error("Không thể xem chi tiết sản phẩm");
  };

  // === HELPER: getVariantLabel ===
  const getVariantLabel = (variant) => {
    if (!variant) return "";
    const cat = product?.category;
    if (cat === "iPhone") return variant.storage;
    if (cat === "iPad") return `${variant.storage} ${variant.connectivity}`;
    if (cat === "Mac")
      return `${variant.cpuGpu} • ${variant.ram} • ${variant.storage}`;
    return variant.variantName || variant.storage || "";
  };

  return (
    <>
      <Card
        className="w-full max-w-[280px] h-[600px] mx-auto overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-white border-0 relative group"
        onClick={isVariantReady ? handleCardClick : undefined}
        style={{ cursor: isVariantReady ? "pointer" : "default" }}
      >
        {/* LOADING KHI CHƯA CÓ SKU/SLUG */}
        {!isVariantReady && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
          </div>
        )}

        {/* === DEBUG UI: BASE SLUG + VARIANT SLUG + SKU === */}
        {process.env.NODE_ENV === "development" && (
          <div className="absolute top-12 left-3 z-50 bg-black/90 text-white text-[10px] px-2 py-1 rounded font-mono space-y-1 max-w-[200px]">
            <div className="truncate">
              Base:{" "}
              <code className="text-blue-400">
                {product.baseSlug || "NULL"}
              </code>
            </div>
            <div className="truncate">
              Var:{" "}
              <code className="text-green-400">
                {selectedVariant?.slug || "NULL"}
              </code>
            </div>
            <div className="truncate">
              SKU:{" "}
              <code className="text-yellow-400">
                {selectedVariant?.sku || "NULL"}
              </code>
            </div>
          </div>
        )}

        {/* === ADMIN: Sửa / Xóa === */}
        {isAdmin && (
          <>
            <div className="absolute bottom-3 right-12 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white shadow-md"
                onClick={handleEditClick}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-3 right-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 bg-red-500 hover:bg-red-600"
                onClick={handleDeleteClick}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* === Badge GIẢM GIÁ === */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-20">
            <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold text-xs px-2 py-1 rounded-md shadow-md">
              -{discountPercent}%
            </Badge>
          </div>
        )}

        {/* === Badge TRẠNG THÁI === */}
        {rightBadge && (
          <div className="absolute top-3 right-3 z-20">
            <Badge
              className={`${rightBadge.color} font-bold text-xs px-2 py-1 rounded-md shadow-md`}
            >
              {rightBadge.text}
            </Badge>
          </div>
        )}

        {/* === Ảnh sản phẩm === */}
        <div className="relative aspect-[3/4] bg-white overflow-hidden p-6 pt-10">
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />

          {/* === Nút thêm giỏ hàng === */}
          {!isAdmin &&
            isAuthenticated &&
            user?.role === "CUSTOMER" &&
            totalStock > 0 && (
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

        {/* === Thông tin sản phẩm === */}
        <div className="px-4 space-y-1 bg-white">
          <h3 className="font-bold text-lg line-clamp-2 text-gray-900 leading-tight">
            {product.name}
          </h3>

          {installmentText && (
            <Badge
              variant="outline"
              className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-0.5 rounded-md border-0"
            >
              {installmentText}
            </Badge>
          )}

          <div className="space-y-0.5 pt-1">
            {displayOriginalPrice > displayPrice && (
              <p className="text-sm text-gray-500 line-through">
                {formatPrice(displayOriginalPrice)}
              </p>
            )}
            <p className="text-2xl font-bold text-red-600">
              {formatPrice(displayPrice)}
            </p>
          </div>

          <div className="pt-2">
            <StarRating rating={rating} reviewCount={reviewCount} />
            <div className="mt-2 border-b border-gray-200"></div>
          </div>

          {variantKeyOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-3">
              {variantKeyOptions.map((keyValue) => (
                <button
                  key={keyValue}
                  onClick={(e) => handleVariantKeyClick(e, keyValue)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                    current[keyField] === keyValue
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {keyValue}
                </button>
              ))}
            </div>
          )}

          {totalStock === 0 && (
            <p className="text-xs text-red-600 font-medium pt-2">Hết hàng</p>
          )}
          {totalStock > 0 && totalStock <= 5 && (
            <p className="text-xs text-orange-600 font-medium pt-2">
              Chỉ còn {totalStock} sản phẩm!
            </p>
          )}
        </div>
      </Card>

      {/* === Dialog xác nhận xóa === */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{product.name}</strong> không?{" "}
              <br />
              <span className="text-red-600 font-medium">
                Hành động này không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductCard;
