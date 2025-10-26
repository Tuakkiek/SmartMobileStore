// src/components/shared/ProductCard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { getTopNewProducts, getTopSelling } from "@/lib/api";

const mapToApiCategory = (category) => {
  if (!category) return "";
  return category
    .toLowerCase()
    .replace(" ", "")
    .replace("phụkiện", "accessory");
};

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [topNew, setTopNew] = useState([]);
  const [topSelling, setTopSelling] = useState([]);

  const apiCategory = mapToApiCategory(product.category);

  useEffect(() => {
    if (apiCategory) {
      getTopNewProducts().then(setTopNew).catch(console.error);
      getTopSelling(apiCategory).then(setTopSelling).catch(console.error);
    }
  }, [apiCategory]);

  const variant = product.variants?.[0] || {
    price: product.price || 0,
    originalPrice: product.originalPrice || product.price || 0,
    images: product.images || [],
    stock: product.quantity || 0,
  };

  const discount =
    variant.originalPrice > 0
      ? Math.round(
          ((variant.originalPrice - variant.price) / variant.originalPrice) *
            100
        )
      : 0;

  const isNew = topNew.includes(product._id?.toString());
  const isBestSelling = topSelling.includes(product._id?.toString());

  let rightBadge = null;
  let rightBadgeClass = "";

  if (isNew) {
    rightBadge = "Mới";
    rightBadgeClass = "bg-green-500 text-white";
  } else if (isBestSelling) {
    rightBadge = "Bán chạy";
    rightBadgeClass = "bg-green-500 text-white";
  } else if (product.installmentBadge && product.installmentBadge !== "NONE") {
    rightBadge = product.installmentBadge;
    rightBadgeClass = "bg-blue-500 text-white";
  } else if (product.status !== "AVAILABLE") {
    rightBadge = getStatusText(product.status);
    rightBadgeClass = getStatusColor(product.status);
  }

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role !== "CUSTOMER") {
      toast.error("Chỉ khách hàng mới có thể thêm vào giỏ hàng");
      return;
    }

    const result = await addToCart(product._id, 1);
    if (result.success) {
      toast.success("Đã thêm vào giỏ hàng", {
        description: product.name,
      });
    } else {
      toast.error(result.message || "Thêm vào giỏ hàng thất bại");
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      <div className="aspect-square relative bg-gray-100">
        {variant.images[0] ? (
          <img
            src={variant.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
            Giảm {discount}%
          </Badge>
        )}

        {/* Right Badge (Special or Status) */}
        {rightBadge && (
          <Badge className={`absolute top-2 right-2 ${rightBadgeClass}`}>
            {rightBadge}
          </Badge>
        )}

        {/* Quick Add Button */}
        {isAuthenticated &&
          user?.role === "CUSTOMER" &&
          product.status === "AVAILABLE" && (
            <Button
              size="sm"
              className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Thêm
            </Button>
          )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Product Name */}
          <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem]">
            {product.name}
          </h3>

          {/* Model */}
          {product.model && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {product.model}
            </p>
          )}

          {/* Subcategory */}
          {product.subcategory && (
            <Badge variant="outline" className="text-xs">
              {product.subcategory}
            </Badge>
          )}

          {/* Rating */}
          {product.totalReviews > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex">
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
              </div>
              <span className="text-xs text-muted-foreground">
                ({product.totalReviews})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                {formatPrice(variant.price)}
              </span>
            </div>
            {variant.originalPrice > variant.price && (
              <p className="text-sm text-muted-foreground line-through">
                {formatPrice(variant.originalPrice)}
              </p>
            )}
          </div>

          {/* Stock Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Còn lại:</span>
            <span
              className={`font-medium ${
                variant.stock > 10
                  ? "text-green-600"
                  : variant.stock > 0
                  ? "text-orange-600"
                  : "text-red-600"
              }`}
            >
              {variant.stock} sản phẩm
            </span>
          </div>

          {/* Specifications Preview */}
          {product.specifications && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {product.specifications.storage && (
                <Badge variant="secondary" className="text-xs">
                  {product.specifications.storage}
                </Badge>
              )}
              {product.specifications.color && (
                <Badge variant="secondary" className="text-xs">
                  {product.specifications.color}
                </Badge>
              )}
              {product.specifications.chip && (
                <Badge variant="secondary" className="text-xs">
                  {product.specifications.chip}
                </Badge>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {product.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default ProductCard;
