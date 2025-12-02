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

// Danh sách danh mục với icon và đường dẫn
const categories = [
  {
    name: "iPhone",
    icon: Smartphone,
    path: "/products?category=iPhone",
  },
  {
    name: "iPad",
    icon: Tablet,
    path: "/products?category=iPad",
  },
  {
    name: "Mac",
    icon: Laptop,
    path: "/products?category=Mac",
  },
  {
    name: "Watch",
    icon: Watch,
    path: "/products?category=AppleWatch",
  },
  {
    name: "AirPods",
    icon: Headphones,
    path: "/products?category=AirPods",
  },
  {
    name: "Phụ kiện",
    icon: Box,
    path: "/products?category=Accessories",
  },
];

const CategoryNav = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (path) => {
    navigate(path);
  };

  return (
    <section className="bg-white border-b border-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;

            return (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.path)}
                className="group flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-primary hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white group-hover:bg-white/90 transition-colors">
                  <Icon className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
                </div>
                <div className="text-center">
                  <span className="text-xs md:text-sm font-medium text-gray-900 group-hover:text-white block">
                    {cat.name}
                  </span>
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
