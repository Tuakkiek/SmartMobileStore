import React, { useState } from "react";
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
  "Apple Watch": "bg-red-500",
  AirPods: "bg-green-500",
  Accessories: "bg-orange-500",
};

export const ProductCard = ({ product, onUpdate }) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showBadgeEditor, setShowBadgeEditor] = useState(false);
  const [badges, setBadges] = useState(product.badges || []);

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!user || user.role !== "CUSTOMER") {
      toast.error("Chỉ khách hàng mới có thể thêm vào giỏ hàng");
      return;
    }

    if (!product?._id) {
      toast.error("Sản phẩm không hợp lệ");
      return;
    }

    if (product.quantity < 1) {
      toast.error("Sản phẩm đã hết hàng");
      return;
    }

    setIsAdding(true);
    try {
      const result = await addToCart(product._id, 1);

      if (result.success) {
        toast.success("Đã thêm vào giỏ hàng", {
          description: product.name,
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

  const categoryColor = CATEGORY_COLORS[product.category] || "bg-gray-500";

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".badge-editor")) {
        setShowBadgeEditor(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden badge-editor">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">📦</span>
          </div>
        )}

        {/* Discount Badge - Top Left (Red) */}
        {product.discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full font-bold text-sm">
            Giảm {product.discount}%
          </div>
        )}

        {/* Status & Feature Badges - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {product.status === "AVAILABLE" && (
            <div className="relative group">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBadgeEditor(!showBadgeEditor);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium border border-green-600 cursor-pointer transition-colors"
              >
                ✓ {badges.length > 0 ? badges[0] : "Mới"}
              </button>

              {/* Badge Editor Dropdown */}
              {showBadgeEditor && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-48">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Chọn tùy chọn:
                  </p>
                  <div className="space-y-2">
                    {["Mới", "Trả góp 0%", "Bán chạy"].map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={badges.includes(option)}
                          onChange={(e) => {
                            const newBadges = e.target.checked
                              ? [...badges, option]
                              : badges.filter((b) => b !== option);
                            setBadges(newBadges);
                            if (onUpdate) {
                              onUpdate(product._id, { badges: newBadges });
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Display Selected Badges */}
          {badges.map((badge, idx) => {
            let bgColor = "bg-green-500";
            let icon = "✓";

            if (badge === "Trả góp 0%") {
              bgColor = "bg-blue-500";
              icon = "💳";
            } else if (badge === "Bán chạy") {
              bgColor = "bg-orange-500";
              icon = "🔥";
            }

            return (
              <div
                key={idx}
                className={`${bgColor} text-white px-3 py-1 rounded-full text-xs font-medium border border-opacity-50 text-center`}
              >
                {icon} {badge}
              </div>
            );
          })}
        </div>

        {/* Add to Cart Button - Hover Overlay */}
        {isAuthenticated &&
          user?.role === "CUSTOMER" &&
          product.status === "AVAILABLE" && (
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
      </div>

      {/* Content Container */}
      <CardContent className="p-4 bg-white">
        <div className="space-y-2">
          {/* Product Name */}
          <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem] text-gray-900">
            {product.name}
          </h3>

          {/* Model/SKU - Smaller text */}
          {product.model && (
            <p className="text-xs text-gray-500 line-clamp-1">
              {product.model}
            </p>
          )}

          {/* Subcategory Badge */}
          {product.subcategory && (
            <Badge variant="outline" className="text-xs w-fit">
              {product.subcategory}
            </Badge>
          )}

          {/* Ratings */}
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

          {/* Price Section */}
          <div className="pt-2 border-t">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-blue-600">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Specifications Tags */}
          {product.specifications && (
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
              {product.specifications.chip && (
                <Badge variant="secondary" className="text-xs bg-gray-100">
                  {product.specifications.chip}
                </Badge>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {product.tags.slice(0, 2).map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs text-blue-600 border-blue-200"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stock Status */}
          {product.quantity <= 10 && product.quantity > 0 && (
            <p className="text-xs text-orange-600 font-medium pt-1">
              Chỉ còn {product.quantity} sản phẩm
            </p>
          )}
          {product.quantity === 0 && (
            <p className="text-xs text-red-600 font-medium pt-1">
              Hết hàng
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};