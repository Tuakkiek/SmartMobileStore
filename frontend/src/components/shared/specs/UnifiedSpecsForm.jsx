// frontend/src/components/shared/specs/UnifiedSpecsForm.jsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

/**
 * Form chung cho iPhone, iPad, Mac
 * Tự động hiển thị fields dựa trên category
 */

const UnifiedSpecsForm = ({ category, specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  // ✅ DEFINE FIELDS CONFIG
  const FIELDS_CONFIG = {
    // Common fields (tất cả đều có)
    common: [
      { key: 'chip', label: 'Chip xử lý', placeholder: 'VD: A18 Bionic / M3 Pro', required: true },
      { key: 'ram', label: 'RAM', placeholder: 'VD: 8GB / 16GB', required: true },
      { key: 'storage', label: 'Bộ nhớ trong', placeholder: 'VD: 128GB/256GB/512GB', required: true },
      { key: 'screenSize', label: 'Kích thước màn hình', placeholder: 'VD: 6.7 inch / 14 inch', required: true },
      { key: 'battery', label: 'Pin', placeholder: 'VD: 4,685mAh / 22 giờ sử dụng', required: true },
      { key: 'os', label: 'Hệ điều hành', placeholder: 'VD: iOS 18 / macOS Sonoma', required: true },
    ],

    // iPhone/iPad only
    mobile: [
      { key: 'frontCamera', label: 'Camera trước', placeholder: 'VD: 12MP TrueDepth', required: true },
      { key: 'rearCamera', label: 'Camera sau', placeholder: 'VD: 48MP + 12MP', required: true },
      { key: 'screenTech', label: 'Công nghệ màn hình', placeholder: 'VD: Super Retina XDR / Liquid Retina', required: true },
    ],

    // Mac only
    mac: [
      { key: 'gpu', label: 'GPU', placeholder: 'VD: 14-core GPU', required: true },
      { key: 'screenResolution', label: 'Độ phân giải màn hình', placeholder: 'VD: 3024x1964', required: true },
    ],
  };

  // ✅ GET FIELDS BASED ON CATEGORY
  const getFieldsForCategory = () => {
    const fields = [...FIELDS_CONFIG.common];

    if (category === 'iPhone' || category === 'iPad') {
      fields.push(...FIELDS_CONFIG.mobile);
    }

    if (category === 'Mac') {
      fields.push(...FIELDS_CONFIG.mac);
    }

    return fields;
  };

  const fields = getFieldsForCategory();

  return (
    <div className="space-y-6">
      {/* ✅ DYNAMIC FIELDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={specs[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        ))}
      </div>

      {/* ✅ COLORS SECTION (chung cho tất cả) */}
      <div className="space-y-3 border-t pt-4">
        <Label className="text-base font-semibold">Màu sắc</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Space Black"
                className="flex-1"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onRemoveColor(idx)}
                disabled={colors.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddColor} className="mt-2">
          <Plus className="w-4 h-4 mr-2" /> Thêm màu
        </Button>
      </div>

      {/* ✅ HELPER TEXT */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
        <strong>💡 Gợi ý:</strong>
        {category === 'iPhone' && ' iPhone cần đầy đủ thông tin camera và công nghệ màn hình'}
        {category === 'iPad' && ' iPad cần đầy đủ thông tin camera và công nghệ màn hình'}
        {category === 'Mac' && ' Mac cần GPU và độ phân giải màn hình thay vì camera'}
      </div>
    </div>
  );
};

export default UnifiedSpecsForm;

