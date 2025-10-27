// ============================================
// FILE: frontend/src/components/shared/ProductCard.jsx
// ✅ FULL IMPLEMENTATION: Badges + Discount + Admin Actions
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

  const isAdmin = user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

  // ✅ Ensure variants is always an array
  const safeVariants = Array.isArray(product?.variants) ? product.variants : [];

  // === 1. Chọn variant mặc định có stock > 0 ===
  useEffect(() => {
    const available = safeVariants.find((v) => v && v.stock > 0);
    setSelectedVariant(available || safeVariants[0] || null);
  }, [product.variants]);

  const current = selectedVariant || {};
  const displayPrice = current.price || product.price || 0;
  const displayOriginalPrice =
    current.originalPrice || product.originalPrice || 0;

  // === 2. Ảnh hiển thị ===
  const displayImage =
    current?.images?.[0] ||
    (Array.isArray(product.images) ? product.images[0] : null) ||
    product.image ||
    "/placeholder.png";

  // === 3. % GIẢM GIÁ - HIỂN thị góc trên bên trái ===
  const discountPercent =
    displayOriginalPrice > displayPrice
      ? Math.round(
          ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
        )
      : 0;

  // === 4. BADGE GÓC TRÊN BÊN PHẢI - PRIORITY: TOP NEW > TOP SELLER > INSTALLMENT ===
  const getRightBadge = () => {
    // Priority 1: Mới (top 10 mới nhất)
    if (isTopNew) {
      return { text: "Mới", color: "bg-green-500 text-white" };
    }

    // Priority 2: Bán chạy (top 10 bán nhiều nhất)
    if (isTopSeller) {
      return { text: "Bán chạy", color: "bg-yellow-600 text-white" };
    }

    // Priority 3: Trả góp 0% (do admin set)
    if (product.installmentBadge === "Trả góp 0%, trả trước 0đ") {
      return {
        text: "Trả góp 0%, trả trước 0đ",
        color: "bg-blue-500 text-white text-xs",
      };
    }

    if (product.installmentBadge === "Trả góp 0%") {
      return {
        text: "Trả góp 0%",
        color: "bg-blue-500 text-white",
      };
    }

    return null;
  };

  const rightBadge = getRightBadge();

  // === 5. Installment TEXT bên dưới ảnh (chỉ hiển thị khi không có badge Mới/Bán chạy) ===
  const showInstallmentText =
    !isTopNew &&
    !isTopSeller &&
    (product.installmentBadge === "Trả góp 0%" ||
      product.installmentBadge === "Trả góp 0%, trả trước 0đ");

  // === 6. Danh sách storage options ===
  const storageOptions = Array.from(
    new Set(
      safeVariants
        .filter((v) => v && v.stock > 0 && v.storage)
        .map((v) => v.storage)
        .sort((a, b) => parseInt(a) - parseInt(b))
    )
  );

  // === 7. Tổng stock ===
  const totalStock = safeVariants.reduce((sum, v) => sum + (v?.stock || 0), 0);

  // === 8. Chọn storage ===
  const handleStorageClick = (e, storage) => {
    e.stopPropagation();
    const variant = safeVariants.find(
      (v) => v.storage === storage && v.stock > 0
    );
    if (variant) setSelectedVariant(variant);
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
          description: `${product.name} • ${selectedVariant.storage}`,
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

  return (
    <>
      <Card
        className="w-full max-w-[280px] h-[550px] mx-auto overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white border-0 relative"
        onClick={() => !isAdmin && navigate(`/products/${product._id}`)}
      >
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

        {/* === Badge GIẢM GIÁ (góc trên trái) === */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-20">
            <Badge className="bg-red-500 text-white font-bold text-sm px-3 py-1 rounded-md shadow-md">
              -{discountPercent}%
            </Badge>
          </div>
        )}

        {/* === Badge TRẠNG THÁI (góc trên phải) === */}
        {rightBadge && (
          <div className="absolute top-3 right-3 z-20">
            <Badge
              className={`${rightBadge.color} font-bold text-sm px-3 py-1 rounded-md shadow-md`}
            >
              {rightBadge.text}
            </Badge>
          </div>
        )}

        {/* === Ảnh sản phẩm === */}
        <div className="relative aspect-[3/4] bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
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
        <div className="p-4 space-y-3 bg-white">
          <h3 className="font-bold text-lg line-clamp-2 text-gray-900 leading-tight">
            {product.name}
          </h3>

          {/* === Trả góp text (chỉ hiển thị khi KHÔNG có badge Mới/Bán chạy) === */}
          {showInstallmentText && (
            <p className="text-xs text-gray-600">{product.installmentBadge}</p>
          )}

          {/* === Giá === */}
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

          {/* === Đánh giá === */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(product.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">
                ({product.reviewCount} đánh giá)
              </span>
            </div>
          )}

          {/* === Dung lượng === */}
          {storageOptions.length > 1 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {storageOptions.map((storage) => (
                <button
                  key={storage}
                  onClick={(e) => handleStorageClick(e, storage)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                    current.storage === storage
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {storage}
                </button>
              ))}
            </div>
          )}

          {/* === Tồn kho === */}
          {totalStock === 0 ? (
            <p className="text-xs text-red-600 font-medium">Hết hàng</p>
          ) : totalStock <= 5 ? (
            <p className="text-xs text-orange-600 font-medium">
              Chỉ còn {totalStock} sản phẩm!
            </p>
          ) : null}
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
