// frontend/src/components/homepage/CategoryNav.jsx
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

const CATEGORY_CONFIG = [
  {
    name: "iPhone",
    icon: Smartphone,
    path: "/products?category=iPhone",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    name: "iPad",
    icon: Tablet,
    path: "/products?category=iPad",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    name: "Mac",
    icon: Laptop,
    path: "/products?category=Mac",
    gradient: "from-gray-600 to-gray-700",
  },
  {
    name: "Watch",
    icon: Watch,
    path: "/products?category=AppleWatch",
    gradient: "from-red-500 to-red-600",
  },
  {
    name: "AirPods",
    icon: Headphones,
    path: "/products?category=AirPods",
    gradient: "from-green-500 to-green-600",
  },
  {
    name: "Phụ kiện",
    icon: Box,
    path: "/products?category=Accessories",
    gradient: "from-orange-500 to-orange-600",
  },
];

const CategoryNav = ({ productCounts = {} }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (path) => {
    navigate(path);
  };

  return (
    <section className="bg-slate-100 border-b border-black py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORY_CONFIG.map(
            ({ key, display, icon: Icon, path, count: fallbackCount }) => {
              const count = productCounts[key] ?? fallbackCount; // dùng count từ props, không có thì null

              return (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(path)}
                  className="group flex flex-col items-center gap-2 p-4 bg-gray-200 rounded-xl hover:bg-primary hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white group-hover:bg-white/90 transition-colors">
                    <Icon className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs md:text-sm font-medium text-gray-900 group-hover:text-white block">
                      {display}
                    </span>
                    {count !== null && count > 0 && (
                      <span className="text-[10px] md:text-xs text-gray-500 group-hover:text-white/80">
                        {count}+ sản phẩm
                      </span>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
