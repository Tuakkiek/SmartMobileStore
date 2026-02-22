// frontend/src/components/homepage/ProductsSection.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import {
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Box,
} from "lucide-react";

const CATEGORY_ICONS = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Laptop,
  AppleWatch: Watch,
  AirPods: Headphones,
  Accessories: Box,
};

const getCreateAtTimestamp = (product) => {
  const rawValue = product?.createAt || product?.createdAt;
  const timestamp = rawValue ? new Date(rawValue).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const ProductsSection = ({
  title,
  products,
  showBadges = false, // bật badge cho section này
  badgeType = null, // "new" | "seller" | null
  category,
  isAdmin = false,
  onEdit,
  onDelete,
  viewAllLink,
}) => {
  const navigate = useNavigate();

  const displayProducts =
    showBadges && badgeType === "new"
      ? [...(products || [])]
          .sort((a, b) => getCreateAtTimestamp(b) - getCreateAtTimestamp(a))
          .slice(0, 10)
      : products || [];

  // Nếu không có sản phẩm → không render section
  if (!displayProducts || displayProducts.length === 0) return null;

  const Icon = category ? CATEGORY_ICONS[category] : null;

  return (
    <section className="py-10 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {title}
            </h2>
          </div>

          {viewAllLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(viewAllLink)}
              className="hover:bg-primary hover:text-white transition-colors"
            >
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {displayProducts.map((product) => (
            <div key={product._id} className="relative group">
              <ProductCard
                product={product}
                // Chỉ hiển thị badge đúng với section này
                isTopNew={showBadges && badgeType === "new"}
                isTopSeller={showBadges && badgeType === "seller"}
                onEdit={isAdmin ? () => onEdit(product) : undefined}
                onDelete={
                  isAdmin
                    ? () => onDelete(product._id, product.category)
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;

