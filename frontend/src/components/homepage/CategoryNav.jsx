// ============================================
// FILE: frontend/src/components/homepage/CategoryNav.jsx
// Category navigation section
// ============================================

import React from "react";
import { useNavigate } from "react-router-dom";
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

const CategoryNav = ({ allProducts }) => {
  const navigate = useNavigate();

  // Count products per category
  const productCounts = React.useMemo(() => {
    const counts = {};
    Object.keys(CATEGORY_ICONS).forEach((cat) => {
      counts[cat] = allProducts.filter((p) => p.category === cat).length;
    });
    return counts;
  }, [allProducts]);

  const handleCategoryClick = (category) => {
    const routes = {
      iPhone: "/dien-thoai",
      iPad: "/may-tinh-bang",
      Mac: "/macbook",
      AppleWatch: "/apple-watch",
      AirPods: "/tai-nghe",
      Accessories: "/phu-kien",
    };
    navigate(routes[category] || `/products?category=${category}`);
  };

  return (
    <section className="bg-white border-b border-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Object.keys(CATEGORY_ICONS).map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const count = productCounts[cat] || 0;

            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="group flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-primary hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white group-hover:bg-white/90 transition-colors">
                  <Icon className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
                </div>
                <div className="text-center">
                  <span className="text-xs md:text-sm font-medium text-gray-900 group-hover:text-white block">
                    {cat}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] md:text-xs text-gray-500 group-hover:text-white/80">
                      {count}+
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
