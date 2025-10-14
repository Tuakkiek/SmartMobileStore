// FILE: src/components/shared/ProductCard.jsx - Enhanced
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const CATEGORY_COLORS = {
  iPhone: "bg-blue-500",
  iPad: "bg-purple-500",
  Mac: "bg-gray-700",
  'Apple Watch': "bg-red-500",
  AirPods: "bg-green-500",
  Accessories: "bg-orange-500",
};

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

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

  const categoryColor = CATEGORY_COLORS[product.category] || "bg-gray-500";

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      <div className="aspect-square relative bg-gray-100">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Category Badge */}
        <Badge className={`absolute top-2 left-2 ${categoryColor} text-white`}>
          {product.category}
        </Badge>

        {/* Status Badge */}
        <Badge
          className={`absolute top-2 right-2 ${getStatusColor(product.status)}`}
        >
          {getStatusText(product.status)}
        </Badge>

        {/* Discount Badge */}
        {product.discount > 0 && (
          <Badge className="absolute bottom-2 right-2 bg-red-500 text-white">
            -{product.discount}%
          </Badge>
        )}

        {/* Quick Add Button */}
        {isAuthenticated && user?.role === "CUSTOMER" && product.status === "AVAILABLE" && (
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
          <p className="text-sm text-muted-foreground line-clamp-1">
            {product.model}
          </p>

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
                {formatPrice(product.price)}
              </span>
            </div>
            {product.originalPrice > product.price && (
              <p className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </p>
            )}
          </div>

          {/* Stock Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Còn lại:</span>
            <span
              className={`font-medium ${
                product.quantity > 10
                  ? "text-green-600"
                  : product.quantity > 0
                  ? "text-orange-600"
                  : "text-red-600"
              }`}
            >
              {product.quantity} sản phẩm
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