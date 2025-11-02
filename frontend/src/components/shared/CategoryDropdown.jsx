// ============================================
// FILE: src/components/shared/CategoryDropdown.jsx
// Category Dropdown với dữ liệu thực từ API
// Thiết kế lại UI theo ảnh cung cấp
// = ============================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

// API imports
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  "Apple Watch": appleWatchAPI,
  "Phụ Kiện": accessoryAPI,
};

// Danh sách Category
const categories = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "Apple Watch",
  "Phụ Kiện",
];

const CategoryDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0); // Mặc định chọn iPhone
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // ============================================
  // HOOKS & HANDLERS
  // ============================================

  // Close dropdown khi click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        // Không reset selectedCategory để giữ trạng thái khi mở lại
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fetch dữ liệu khi chọn category
  const handleCategoryClick = useCallback(
    async (categoryName, index) => {
      setSelectedCategory(index);
      // Nếu đã có dữ liệu thì không fetch lại
      if (categoryData[categoryName]) return;

      setLoading(true);
      try {
        const api = API_MAP[categoryName];
        if (!api) return;

        const response = await api.getAll({ limit: 100 }); // Lấy nhiều hơn để đảm bảo có đủ mẫu
        const products = response.data?.data?.products || response.data || [];

        // Group products by model
        const modelGroups = {};
        products.forEach((product) => {
          const model = product.model || product.name;

          if (!modelGroups[model]) {
            modelGroups[model] = {
              model,
              image:
                product.images?.[0] || product.variants?.[0]?.images?.[0] || "",
              products: [],
            };
          }
          modelGroups[model].products.push(product);
        });

        const models = Object.values(modelGroups).sort((a, b) =>
          a.model.localeCompare(b.model)
        );

        setCategoryData((prev) => ({
          ...prev,
          [categoryName]: models,
        }));
      } catch (error) {
        console.error(`Error fetching ${categoryName}:`, error);
      } finally {
        setLoading(false);
      }
    },
    [categoryData]
  );

  // Tự động fetch dữ liệu cho category đầu tiên khi component mount hoặc dropdown mở
  useEffect(() => {
    if (
      isOpen &&
      selectedCategory !== null &&
      !categoryData[categories[selectedCategory]]
    ) {
      handleCategoryClick(categories[selectedCategory], selectedCategory);
    }
  }, [isOpen, selectedCategory, categoryData, handleCategoryClick]);

  const handleModelClick = (categoryName, model) => {
    const categoryParam =
      categoryName === "Apple Watch"
        ? "AppleWatch"
        : categoryName === "Phụ Kiện"
        ? "Accessories"
        : categoryName;

    navigate(
      `/products?category=${encodeURIComponent(
        categoryParam
      )}&model=${encodeURIComponent(model)}`
    );
    setIsOpen(false);
    setSelectedCategory(0); // Reset về iPhone khi đóng
  };

  const handleViewAllClick = (categoryName) => {
    const categoryParam =
      categoryName === "Apple Watch"
        ? "AppleWatch"
        : categoryName === "Phụ Kiện"
        ? "Accessories"
        : categoryName;
    navigate(`/products?category=${encodeURIComponent(categoryParam)}`);
    setIsOpen(false);
    setSelectedCategory(0); // Reset về iPhone khi đóng
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    // Dropdown Container
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-200 hover:scale-105"
      >
        <Menu className="w-5 h-5" />
        <span className="font-medium">Danh mục</span>
      </button>

      {/* Dropdown Menu - Căn giữa và Responsive */}
      {isOpen && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 mt-0 bg-white rounded-3xl shadow-2xl overflow-hidden max-w-7xl w-[calc(100vw-3rem)] z-50 hidden md:block"
          onMouseLeave={() => {
            setIsOpen(false);
            setSelectedCategory(0); // Reset về iPhone khi đóng
          }}
        >
          {/* Main Content Area - Split into 2 columns */}
          <div className="flex">
            {/* Left Column - Category List */}
            <div className="w-1/4 bg-gray-50 p-6 flex flex-col justify-between">
              <div>
                {categories.map((name, idx) => (
                  <button
                    key={idx}
                    onMouseEnter={() => handleCategoryClick(name, idx)}
                    onClick={() => handleCategoryClick(name, idx)}
                    className={`flex items-center w-full px-4 py-3 rounded-xl text-left text-base font-medium transition-all duration-300 mb-2 ${
                      selectedCategory === idx
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {/* Placeholder for icons - replace with actual Lucide icons if desired */}
                    {/* Example: {name === "iPhone" && <Smartphone className="w-5 h-5 mr-3" />} */}
                    {name}
                  </button>
                ))}
              </div>

              {/* "Xem chi tiết" Button */}
              {selectedCategory !== null && (
                <button
                  onClick={() =>
                    handleViewAllClick(categories[selectedCategory])
                  }
                  className="mt-4 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  Xem chi tiết <Menu className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right Column - Category Details */}
            <div className="w-3/4 p-8 overflow-y-auto max-h-[600px]">
              {selectedCategory !== null ? (
                <>
                  {/* Gợi ý cho bạn section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-orange-500 text-xl">🔥</span>
                      <h3 className="text-xl font-bold text-gray-900">
                        Gợi ý cho bạn
                      </h3>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {/* Placeholders for suggested products */}
                      {[
                        {
                          name: "iPhone 15 Pro",
                          image:
                            "https://via.placeholder.com/100x100?text=iPhone15",
                        },
                        {
                          name: "iPad Air 5",
                          image:
                            "https://via.placeholder.com/100x100?text=iPadAir",
                        },
                        {
                          name: "MacBook Air M2",
                          image:
                            "https://via.placeholder.com/100x100?text=MBAir",
                        },
                        {
                          name: "Apple Watch SE",
                          image:
                            "https://via.placeholder.com/100x100?text=WatchSE",
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-contain rounded-lg"
                          />
                          <span className="text-sm text-gray-700 text-center line-clamp-2">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chọn theo dòng section */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Chọn theo dòng {categories[selectedCategory]}
                    </h3>
                    {loading ? (
                      <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        {categoryData[categories[selectedCategory]]?.map(
                          (modelGroup, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                handleModelClick(
                                  categories[selectedCategory],
                                  modelGroup.model
                                )
                              }
                              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                            >
                              {/* Model Image */}
                              <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                                {modelGroup.image ? (
                                  <img
                                    src={modelGroup.image}
                                    alt={modelGroup.model}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No img
                                  </div>
                                )}
                              </div>
                              {/* Model Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                  {modelGroup.model}
                                </p>
                                {/* Placeholder for sub-models/variants, populate with actual data */}
                                <ul className="text-sm text-gray-500 list-disc list-inside space-y-0.5">
                                  {modelGroup.products
                                    .slice(0, 3)
                                    .map((product, pIdx) => (
                                      <li key={pIdx} className="line-clamp-1">
                                        {product.name}
                                      </li>
                                    ))}
                                  {modelGroup.products.length > 3 && (
                                    <li className="text-xs text-blue-600">
                                      +{modelGroup.products.length - 3} phiên
                                      bản khác
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Default view when no category is selected yet, or initial state
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-500">
                  <p className="text-xl mb-4">
                    Chọn một danh mục để xem chi tiết
                  </p>
                  <Menu className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;
