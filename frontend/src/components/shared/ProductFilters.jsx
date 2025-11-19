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

const ProductFilters = ({
  filters,
  onFilterChange,
  priceRange,
  onPriceChange,
  availableFilters,
  onClearFilters,
  activeFiltersCount,
  className = "",
}) => {
  // State để quản lý việc đóng/mở các section của bộ lọc
  const [expandedSections, setExpandedSections] = useState({});

  // Khởi tạo trạng thái mở cho các filter có sẵn
  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev };
      Object.keys(availableFilters).forEach((key) => {
        if (next[key] === undefined) next[key] = true;
      });
      return next;
    });
  }, [availableFilters]);

  const [selectedPricePreset, setSelectedPricePreset] = useState(null);

  // Toggle section visibility
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle price preset click
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
          <SlidersHorizontal className="w-4 h-4" /> Bộ lọc
        </h2>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            Xóa ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Dynamic Category Filters */}
      {Object.entries(availableFilters).map(([key, options]) => (
        <div key={key} className="mb-4">
          <button
            onClick={() => toggleSection(key)}
            className="flex items-center justify-between w-full mb-3"
          >
            <span className="font-medium text-sm">
              {FILTER_LABELS[key] || key}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
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
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
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
                  </label>
                );
              })}
            </div>
          )}

          <div className="border-t mt-4"></div>
        </div>
      ))}

      {/* Price Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full mb-3"
        >
          <span className="font-medium text-sm">Khoảng giá</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expandedSections.price ? "rotate-180" : ""
            }`}
          />
        </button>

        {expandedSections.price !== false && (
          <div className="space-y-3 pl-1">
            {/* Presets */}
            <div className="space-y-2">
              {PRICE_RANGES.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePricePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPricePreset === preset.label
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="pt-3 border-t">
              <p className="text-xs text-gray-500 mb-2">
                Hoặc nhập khoảng giá (VNĐ)
              </p>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Giá từ"
                  value={priceRange.min}
                  onChange={(e) => {
                    setSelectedPricePreset(null);
                    onPriceChange({ ...priceRange, min: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Giá đến"
                  value={priceRange.max}
                  onChange={(e) => {
                    setSelectedPricePreset(null);
                    onPriceChange({ ...priceRange, max: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => onPriceChange(priceRange)}
                  disabled={!priceRange.min && !priceRange.max}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Áp dụng
                </button>
              </div>

              {/* Current price range display */}
              {(priceRange.min || priceRange.max) && (
                <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  {priceRange.min && priceRange.max
                    ? `${formatPrice(priceRange.min)} - ${formatPrice(
                        priceRange.max
                      )} VNĐ`
                    : priceRange.min
                    ? `Từ ${formatPrice(priceRange.min)} VNĐ`
                    : `Đến ${formatPrice(priceRange.max)} VNĐ`}
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
