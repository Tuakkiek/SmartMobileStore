// ============================================
// FILE: frontend/src/components/shared/ProductCard.jsx
// ✅ SỬA LẠI THEO ẢNH MẪU + XỬ LÝ TRƯỜNG HỢP "NONE"
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

  const isAdmin = user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

  // ✅ Ensure variants is always an array
  const safeVariants = Array.isArray(product?.variants) ? product.variants : [];

  // === 1. Chọn variant mặc định có stock > 0 ===
  useEffect(() => {
    const available = safeVariants.find((v) => v && v.stock > 0);
    // Chọn variant có giá rẻ nhất nếu không có stock > 0
    const cheapestVariant =
      safeVariants.length > 0
        ? safeVariants.reduce(
            (min, v) => (v.price < min.price ? v : min),
            safeVariants[0]
          )
        : null;

    setSelectedVariant(available || cheapestVariant || null);
  }, [product.variants]);

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

  // === 3. % GIẢM GIÁ - HIỂN thị góc trên bên trái (Giữ nguyên logic cũ) ===
  const discountPercent =
    displayOriginalPrice > displayPrice
      ? Math.round(
          ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
        )
      : 0;

  // === 4. BADGE GÓC TRÊN BÊN PHẢI - PRIORITY: TOP NEW > TOP SELLER ===
  const getRightBadge = () => {
    // Priority 1: Mới
    if (isTopNew) {
      return {
        text: "Mới",
        color: "bg-green-500 hover:bg-green-500 text-white",
      };
    }

    // Priority 2: Bán chạy
    if (isTopSeller) {
      // Dùng màu Xanh lá (Bán chạy) theo ảnh 2 (image_f138c1.png)
      return {
        text: "Bán chạy",
        color: "bg-green-500 hover:bg-green-500 text-white",
      };
    }

    return null;
  };

  const rightBadge = getRightBadge();

  // === 5. Installment TEXT bên dưới tên sản phẩm ===
  // ✅ LOGIC CẬP NHẬT: Kiểm tra nếu là chuỗi "none" (không phân biệt hoa thường) thì coi như null
  const installmentText =
    product.installmentBadge &&
    product.installmentBadge.toLowerCase() !== "none"
      ? product.installmentBadge
      : null;

  // === 6. Danh sách storage options ===
  const storageOptions = Array.from(
    new Set(
      safeVariants
        .filter((v) => v && v.storage) // Lọc những variant có storage
        .map((v) => v.storage)
        .sort((a, b) => parseInt(a) - parseInt(b))
    )
  );

  // === 7. Tổng stock ===
  const totalStock = safeVariants.reduce((sum, v) => sum + (v?.stock || 0), 0);

  // === 8. Chọn storage ===
  const handleStorageClick = (e, storage) => {
    e.stopPropagation();
    // Ưu tiên chọn variant có stock > 0
    let variant = safeVariants.find(
      (v) => v.storage === storage && v.stock > 0
    );

    // Nếu không có stock > 0, chọn variant bất kỳ
    if (!variant) {
      variant = safeVariants.find((v) => v.storage === storage);
    }

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
        // Thay đổi chiều cao card để phù hợp với ảnh mẫu
        className="w-full max-w-[280px] h-[600px] mx-auto overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white border-0 relative"
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

        {/* === Badge GIẢM GIÁ (góc trên trái) - Màu Đỏ === */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-20">
            {/* Giảm size text, bo tròn nhẹ hơn */}
            <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold text-xs px-2 py-1 rounded-md shadow-md">
              -{discountPercent}%
            </Badge>
          </div>
        )}

        {/* === Badge TRẠNG THÁI (góc trên phải) - Màu Xanh lá/Xanh ngọc === */}
        {rightBadge && (
          <div className="absolute top-3 right-3 z-20">
            {/* Giảm size text, bo tròn nhẹ hơn */}
            <Badge
              className={`${rightBadge.color} font-bold text-xs px-2 py-1 rounded-md shadow-md`}
            >
              {rightBadge.text}
            </Badge>
          </div>
        )}

        {/* === Ảnh sản phẩm === */}
        {/* Aspect ratio 3/4 và padding theo ảnh mẫu */}
        <div className="relative aspect-[3/4] bg-white overflow-hidden p-6 pt-10">
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />

          {/* === Nút thêm giỏ hàng (Chỉ hiển thị cho Customer) === */}
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
          {/* Tên sản phẩm */}
          <h3 className="font-bold text-lg line-clamp-2 text-gray-900 leading-tight">
            {product.name}
          </h3>

          {/* === Trả góp text (Hiển thị ngay dưới tên sản phẩm) === */}
          {/* ✅ Đã cập nhật logic kiểm tra installmentText */}
          {installmentText && (
            <Badge
              variant="outline"
              className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-0.5 rounded-md border-0"
            >
              {installmentText}
            </Badge>
          )}

          {/* === Giá gốc (Nếu có giảm giá) === */}
          <div className="space-y-0.5 pt-1">
            {displayOriginalPrice > displayPrice && (
              <p className="text-sm text-gray-500 line-through">
                {formatPrice(displayOriginalPrice)}
              </p>
            )}
            {/* === Giá bán === */}
            <p className="text-2xl font-bold text-red-600">
              {formatPrice(displayPrice)}
            </p>
          </div>

          {/* === Đánh giá (Luôn hiển thị theo ảnh mẫu) === */}
          <div className="pt-2">
            <StarRating rating={rating} reviewCount={reviewCount} />
            {/* Dùng div với border-b để tạo đường line mỏng dưới đánh giá */}
            <div className="mt-2 border-b border-gray-200"></div>
          </div>

          {/* === Dung lượng === */}
          {storageOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-3">
              {storageOptions.map((storage) => (
                <button
                  key={storage}
                  onClick={(e) => handleStorageClick(e, storage)}
                  // Chỉnh style button nhỏ gọn, bo góc tròn, màu sắc theo ảnh mẫu
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                    current.storage === storage
                      ? "bg-red-600 text-white border-red-600" // Màu đỏ khi được chọn
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {storage}
                </button>
              ))}
            </div>
          )}

          {/* === Tồn kho (Chỉ hiển thị nếu cần cảnh báo) === */}
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

      {/* === Dialog xác nhận xóa (Giữ nguyên) === */}
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
