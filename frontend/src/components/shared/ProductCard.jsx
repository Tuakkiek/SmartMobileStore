// ============================================
// FILE: src/components/shared/ProductCard.jsx
// ✅ FIXED: Added Delete button for ADMIN only, Edit for ADMIN/WAREHOUSE_STAFF/ORDER_MANAGER, Add to Cart for CUSTOMER
// ✅ CSS: Delete button on left, Edit button on right
// ✅ REMOVED: AlertDialog moved to ProductsPage.jsx
// ✅ FIXED: Simplified delete to call onDelete directly, removed isDeleting state and handleDeleteProduct
// ✅ REMOVED: Variants badge, discount badge, and badge editor (including "Mới", "Trả góp 0%", "Bán chạy" badges)
// ============================================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { ShoppingCart, Star, Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const CATEGORY_COLORS = {
  iPhone: "bg-blue-500",
  iPad: "bg-purple-500",
  Mac: "bg-gray-700",
  "Apple Watch": "bg-red-500",
  AirPods: "bg-green-500",
  Accessories: "bg-orange-500",
};

export const ProductCard = ({ product, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);

  const displayPrice = product.displayPrice || product.price;
  const displayOriginalPrice = product.originalPrice;
  const displayImage =
    product.variants?.[0]?.images?.[0] || product.images?.[0];
  const totalStock =
    product.variants?.reduce((sum, v) => sum + v.stock, 0) || product.quantity;

  // Kiểm tra vai trò người dùng
  const isAdmin = isAuthenticated && user?.role === "ADMIN";
  const canEdit =
    isAuthenticated &&
    user &&
    ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user.role);
  const isCustomer = isAuthenticated && user?.role === "CUSTOMER";

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!isCustomer) {
      toast.error("Chỉ khách hàng mới có thể thêm vào giỏ hàng");
      return;
    }

    if (totalStock < 1) {
      toast.error("Sản phẩm đã hết hàng");
      return;
    }

    const firstAvailableVariant = product.variants?.find((v) => v.stock > 0);
    const variantId = firstAvailableVariant?._id || product._id;

    setIsAdding(true);
    try {
      const result = await addToCart(variantId, 1);

      if (result.success) {
        toast.success("Đã thêm vào giỏ hàng", {
          description: `${product.name}${
            firstAvailableVariant
              ? ` • ${firstAvailableVariant.color || ""} ${
                  firstAvailableVariant.storage || ""
                }`.trim()
              : ""
          }`,
        });
      } else {
        toast.error(result.message || "Thêm vào giỏ hàng thất bại");
      }
    } catch (error) {
      toast.error(error.message || "Lỗi hệ thống khi thêm vào giỏ hàng");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditProduct = (e) => {
    e.stopPropagation();
    if (onEdit) {
      console.log("✅ Editing product:", product);
      onEdit(product);
    } else {
      navigate(`/warehouse/products?edit=${product._id}`, {
        state: { product },
      });
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Nút Thêm vào giỏ hàng - Chỉ cho CUSTOMER */}
        {isCustomer && product.status === "AVAILABLE" && totalStock > 0 && (
          <Button
            size="sm"
            className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 hover:bg-gray-100"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            {isAdding ? "..." : "Thêm"}
          </Button>
        )}

        {/* Nút Xóa - Chỉ cho ADMIN */}
        {isAdmin && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={(e) => {
              e.stopPropagation();
              console.log(
                "✅ Delete button clicked for product ID:",
                product._id
              );
              if (!product._id) {
                console.error("❌ Product ID is missing");
                toast.error("Không thể xóa: ID sản phẩm không hợp lệ");
                return;
              }
              if (!onDelete) {
                console.error("❌ onDelete prop is not provided");
                toast.error("Không thể xóa sản phẩm: Lỗi hệ thống");
                return;
              }
              onDelete(product._id);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Xóa
          </Button>
        )}

        {/* Nút Sửa - Cho ADMIN, WAREHOUSE_STAFF, ORDER_MANAGER */}
        {canEdit && (
          <Button
            size="sm"
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 hover:bg-gray-100"
            onClick={handleEditProduct}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Sửa
          </Button>
        )}
      </div>

      <CardContent className="p-4 bg-white">
        <div className="space-y-2">
          <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem] text-gray-900">
            {product.name}
          </h3>

          {product.model && (
            <p className="text-xs text-gray-500 line-clamp-1">
              {product.model}
            </p>
          )}

          {product.subcategory && (
            <Badge variant="outline" className="text-xs w-fit">
              {product.subcategory}
            </Badge>
          )}

          {product.totalReviews > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                ({product.totalReviews})
              </span>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-blue-600">
                {formatPrice(displayPrice)}
              </span>
              {displayOriginalPrice > displayPrice && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(displayOriginalPrice)}
                </span>
              )}
            </div>
          </div>

          {product.variants?.[0] && (
            <div className="flex flex-wrap gap-1 pt-2">
              {product.variants[0].color && (
                <Badge variant="secondary" className="text-xs bg-gray-100">
                  {product.variants[0].color}
                </Badge>
              )}
              {product.variants[0].storage && (
                <Badge variant="secondary" className="text-xs bg-gray-100">
                  {product.variants[0].storage}
                </Badge>
              )}
            </div>
          )}

          {product.specifications && !product.variants?.[0] && (
            <div className="flex flex-wrap gap-1 pt-2">
              {product.specifications.storage && (
                <Badge variant="secondary" className="text-xs bg-gray-100">
                  {product.specifications.storage}
                </Badge>
              )}
              {product.specifications.color && (
                <Badge variant="secondary" className="text-xs bg-gray-100">
                  {product.specifications.color}
                </Badge>
              )}
            </div>
          )}

          {product.tags?.slice(0, 2).map((tag, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="text-xs text-blue-600 border-blue-200"
            >
              {tag}
            </Badge>
          ))}

          {totalStock <= 10 && totalStock > 0 && (
            <p className="text-xs text-orange-600 font-medium pt-1">
              Chỉ còn {totalStock} sản phẩm
            </p>
          )}

          {totalStock === 0 && (
            <p className="text-xs text-red-600 font-medium pt-1">Hết hàng</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
