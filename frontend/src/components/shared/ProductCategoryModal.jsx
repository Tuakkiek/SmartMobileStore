// ============================================
// FILE: src/components/shared/ProductCategoryModal.jsx
// ✅ FIXED: KEYS cho CATEGORIES.map
// ============================================

import React from "react";
import { Button } from "@/components/ui/button.jsx";
import { X } from "lucide-react";
import { CATEGORIES } from "@/lib/productConstants";

const ProductCategoryModal = ({
  selectedCategory,
  setSelectedCategory,
  selectedCondition,
  setSelectedCondition,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Chọn danh mục</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* CATEGORY SELECT */}
        <div className="space-y-4 mb-6">
          <label className="text-sm font-medium">Danh mục sản phẩm</label>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value} // ✅ FIXED: KEY PROP!
                variant={selectedCategory === cat.value ? "default" : "outline"}
                className="justify-start h-12"
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.icon}
                <span className="ml-2">{cat.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* CONDITION SELECT */}
        <div className="space-y-4 mb-6">
          <label className="text-sm font-medium">Tình trạng</label>
          <div className="grid grid-cols-2 gap-2">
            {["NEW", "LIKE_NEW", "GOOD"].map((condition) => (
              <Button
                key={condition} // ✅ FIXED: KEY PROP!
                variant={selectedCondition === condition ? "default" : "outline"}
                className="justify-start h-12"
                onClick={() => setSelectedCondition(condition)}
              >
                {condition === "NEW" && "🆕 Mới"}
                {condition === "LIKE_NEW" && "💎 Như mới"}
                {condition === "GOOD" && "👍 Tốt"}
              </Button>
            ))}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Hủy
          </Button>
          <Button className="flex-1" onClick={onSubmit}>
            Tiếp tục
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCategoryModal;