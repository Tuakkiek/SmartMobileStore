import React, { useState, useEffect } from "react";
import { SlidersHorizontal, ChevronDown, X, Check } from "lucide-react";

// ============================================
// CONSTANTS & CONFIG
// ============================================
export const PRICE_RANGES = [
  { label: "Dưới 5 triệu", min: 0, max: 5000000 },
  { label: "5 - 10 triệu", min: 5000000, max: 10000000 },
  { label: "10 - 15 triệu", min: 10000000, max: 15000000 },
  { label: "15 - 20 triệu", min: 15000000, max: 20000000 },
  { label: "20 - 30 triệu", min: 20000000, max: 30000000 },
  { label: "Trên 30 triệu", min: 30000000, max: Infinity },
];

export const FILTER_LABELS = {
  category: "Danh mục",
  storage: "Dung lượng",
  ram: "RAM",
  connectivity: "Kết nối",
  condition: "Tình trạng",
  color: "Màu sắc",
};

export const CONDITION_LABELS = {
  NEW: "Mới 100%",
  LIKE_NEW: "Like New (99%)",
};

export const CATEGORY_DISPLAY = {
  iPhone: "Điện thoại iPhone",
  iPad: "iPad",
  Mac: "MacBook",
  AirPods: "Tai nghe AirPods",
  AppleWatch: "Apple Watch",
  Accessories: "Phụ kiện Apple",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_DISPLAY);

const ProductFilters = ({
  filters,
  onFilterChange,
  priceRange,
  onPriceChange,
  availableFilters,
  onClearFilters,
  activeFiltersCount,
  className = "",
  currentCategory,
  onCategoryChange, // THÊM PROP MỚI: xử lý khi đổi danh mục từ filter
}) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedPricePreset, setSelectedPricePreset] = useState(null);

  // Mở tất cả section khi availableFilters thay đổi
  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev };
      next.category = true;
      next.price = true;
      Object.keys(availableFilters).forEach((key) => {
        if (next[key] === undefined) next[key] = true;
      });
      return next;
    });
  }, [availableFilters]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePricePresetClick = (preset) => {
    setSelectedPricePreset(preset.label);
    onPriceChange({
      min: preset.min === 0 ? "" : preset.min.toString(),
      max: preset.max === Infinity ? "" : preset.max.toString(),
    });
  };

  const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price);

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" />
          Bộ lọc
        </h2>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Xóa tất cả ({activeFiltersCount})
          </button>
        )}
      </div>
      {/* ================== MỤC DANH MỤC (ĐÃ SỬA ĐẸP) ================== */}
      <div className="mb-5">
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full mb-3 text-left"
        >
          <span className="font-semibold text-gray-800">Danh mục</span>
          <ChevronDown
            className={`w-5 h-5 transition-transform text-gray-500 ${
              expandedSections.category ? "rotate-180" : ""
            }`}
          />
        </button>

        {expandedSections.category && (
          <div className="space-y-2 pl-1">
            {ALL_CATEGORIES.map((cat) => {
              const isCurrent = currentCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => !isCurrent && onCategoryChange?.(cat)}
                  className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between
                    ${
                      isCurrent
                        ? "bg-blue-50 border border-blue-300 text-blue-700 font-medium shadow-sm"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                >
                  <span className="text-sm font-medium">
                    {CATEGORY_DISPLAY[cat]}
                  </span>
                  {isCurrent && <Check className="w-5 h-5 text-blue-600" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="border-t mt-4 pt-1"></div>
      </div>

      {/* ================== CÁC BỘ LỌC KHÁC ================== */}
      {Object.entries(availableFilters).map(([key, options]) => (
        <div key={key} className="mb-5">
          <button
            onClick={() => toggleSection(key)}
            className="flex items-center justify-between w-full mb-3 text-left"
          >
            <span className="font-medium text-gray-800">
              {FILTER_LABELS[key] || key}
            </span>
            <ChevronDown
              className={`w-5 h-5 transition-transform text-gray-500 ${
                expandedSections[key] ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedSections[key] && (
            <div className="space-y-2 pl-1">
              {options.map((opt) => {
                const isChecked = filters[key]?.includes(opt) || false;
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onFilterChange(key, opt)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {key === "condition" ? CONDITION_LABELS[opt] || opt : opt}
                    </span>
                    {isChecked && (
                      <Check className="w-4 h-4 text-blue-600 ml-auto" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <div className="border-t mt-4"></div>
        </div>
      ))}

      {/* ================== KHOẢNG GIÁ ================== */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full mb-3 text-left"
        >
          <span className="font-semibold text-gray-800">Khoảng giá</span>
          <ChevronDown
            className={`w-5 h-5 transition-transform text-gray-500 ${
              expandedSections.price ? "rotate-180" : ""
            }`}
          />
        </button>

        {expandedSections.price && (
          <div className="space-y-3 pl-1">
            <div className="space-y-2">
              {PRICE_RANGES.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePricePresetClick(preset)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${
                      selectedPricePreset === preset.label
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs text-gray-500 mb-3">
                Nhập khoảng giá tùy chỉnh
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Từ (VNĐ)"
                  value={priceRange.min}
                  onChange={(e) => {
                    setSelectedPricePreset(null);
                    onPriceChange({ ...priceRange, min: e.target.value });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Đến (VNĐ)"
                  value={priceRange.max}
                  onChange={(e) => {
                    setSelectedPricePreset(null);
                    onPriceChange({ ...priceRange, max: e.target.value });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => onPriceChange(priceRange)}
                disabled={!priceRange.min && !priceRange.max}
                className="w-full mt-3 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Áp dụng giá
              </button>

              {(priceRange.min || priceRange.max) && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium text-center">
                  Đang lọc:{" "}
                  {priceRange.min && priceRange.max
                    ? `${formatPrice(priceRange.min)} - ${formatPrice(
                        priceRange.max
                      )}`
                    : priceRange.min
                    ? `Từ ${formatPrice(priceRange.min)}`
                    : `Dưới ${formatPrice(priceRange.max)}`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFilters;
