// ============================================
// FILE: frontend/src/components/homepage/ProductsSection.jsx
// Reusable products section with title and grid
// ============================================

import React, { useMemo } from "react";
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

const ProductsSection = ({
  title,
  products,
  allProducts,
  category,
  isAdmin,
  onEdit,
  onDelete,
  viewAllLink,
}) => {
  const navigate = useNavigate();

  // Calculate top 10 new products across all categories
  const topNewIds = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((p) => p._id?.toString());
  }, [allProducts]);

  // Calculate top 10 sellers per category
  const topSellersMap = useMemo(() => {
    const map = {};
    ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessories"].forEach(
      (cat) => {
        const topIds = [...allProducts]
          .filter((p) => p.category === cat && p.salesCount > 0)
          .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
          .slice(0, 10)
          .map((p) => p._id?.toString());
        map[cat] = topIds;
      }
    );
    return map;
  }, [allProducts]);

  // Determine badges for each product
  const getProductBadges = (product) => {
    const productId = product._id?.toString();
    const isTopNew = topNewIds.includes(productId);
    const isTopSeller = topSellersMap[product.category]?.includes(productId);

    return { isTopNew, isTopSeller };
  };

  if (!products || products.length === 0) return null;

  const Icon = category ? CATEGORY_ICONS[category] : null;

  return (
    <section className="py-10 bg-gray-50">
      <div className="container mx-auto px-4">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {products.map((product) => {
            const { isTopNew, isTopSeller } = getProductBadges(product);

            return (
              <div key={product._id} className="relative group">
                <ProductCard
                  product={product}
                  isTopNew={isTopNew}
                  isTopSeller={isTopSeller}
                  onEdit={isAdmin ? () => onEdit(product) : undefined}
                  onDelete={
                    isAdmin
                      ? () => onDelete(product._id, product.category)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
