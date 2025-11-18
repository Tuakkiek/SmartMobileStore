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
  const [expandedSections, setExpandedSections] = useState({
    price: true,
  });

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
    // Nếu click lại vào preset đang chọn -> bỏ chọn
    if (selectedPricePreset === preset.label) {
        setSelectedPricePreset(null);
        onPriceChange({ min: "", max: "" });
    } else {
        setSelectedPricePreset(preset.label);
        onPriceChange({
          min: preset.min === 0 ? "" : preset.min.toString(),
          max: preset.max === Infinity ? "" : preset.max.toString(),
        });
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" /> Bộ lọc
        </h2>
        {activeFiltersCount > 0 && (
          <button
            onClick={() => {
              setSelectedPricePreset(null);
              onClearFilters();
            }}
            className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline flex items-center gap-1 transition-colors"
          >
            Xóa tất cả ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Dynamic Category Filters */}
      <div className="space-y-6">
        {Object.entries(availableFilters).map(([key, options]) => (
            <div key={key} className="group">
            <button
                onClick={() => toggleSection(key)}
                className="flex items-center justify-between w-full mb-3"
            >
                <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                {FILTER_LABELS[key] || key}
                </span>
                <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedSections[key] ? "rotate-180" : ""
                }`}
                />
            </button>

            {expandedSections[key] && (
                <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                {options.map((opt) => {
                    const isChecked = filters[key]?.includes(opt) || false;
                    return (
                        <label
                        key={opt}
                        className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-all duration-200 ${
                            isChecked ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
                        }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={isChecked}
                            onChange={() => onFilterChange(key, opt)}
                        />
                        <span className={`text-sm ${isChecked ? "text-blue-700 font-medium" : "text-gray-600"}`}>
                            {key === "condition" ? CONDITION_LABELS[opt] || opt : opt}
                        </span>
                        </label>
                    );
                })}
                </div>
            )}
            <div className="border-t border-gray-100 mt-4"></div>
            </div>
        ))}

        {/* Price Filter */}
        <div>
            <button
            onClick={() => toggleSection("price")}
            className="flex items-center justify-between w-full mb-3"
            >
            <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Khoảng giá
            </span>
            <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                expandedSections.price ? "rotate-180" : ""
                }`}
            />
            </button>

            {expandedSections.price && (
            <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
                {/* Presets */}
                <div className="grid grid-cols-1 gap-2">
                {PRICE_RANGES.map((preset) => (
                    <button
                    key={preset.label}
                    onClick={() => handlePricePresetClick(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                        selectedPricePreset === preset.label
                        ? "bg-blue-50 border-blue-200 text-blue-700 font-medium shadow-sm"
                        : "border-transparent hover:bg-gray-50 text-gray-600"
                    }`}
                    >
                    {preset.label}
                    </button>
                ))}
                </div>

                {/* Custom Input */}
                <div className="pt-4 mt-2 border-t border-dashed border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase">Tự nhập khoảng giá</p>
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <input
                        type="number"
                        placeholder="0"
                        value={priceRange.min}
                        onChange={(e) => {
                            setSelectedPricePreset(null);
                            onPriceChange({ ...priceRange, min: e.target.value });
                        }}
                        className="w-full pl-3 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="relative flex-1">
                        <input
                        type="number"
                        placeholder="∞"
                        value={priceRange.max}
                        onChange={(e) => {
                            setSelectedPricePreset(null);
                            onPriceChange({ ...priceRange, max: e.target.value });
                        }}
                        className="w-full pl-3 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
                    </div>
                </div>
                
                {(priceRange.min || priceRange.max) && (
                    <div className="bg-blue-50 text-blue-700 text-xs p-2.5 rounded-lg text-center font-medium border border-blue-100">
                        {priceRange.min ? formatPrice(priceRange.min) : "0"} ₫ - {priceRange.max ? formatPrice(priceRange.max) : "∞"} ₫
                    </div>
                )}
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductFilters;

