// ============================================
// FILE: src/components/shared/variants/AccessoriesVariantsForm.jsx
// ✅ VARIANTS FORM CHO PHỤ KIỆN - ĐỒNG BỘ VỚI MULTI-IMAGES
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const AccessoriesVariantsForm = ({ variants, onAddVariant, onRemoveVariant, onVariantChange, onImageChange, onAddImage, onRemoveImage, onOptionChange, onAddOption, onRemoveOption }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Biến thể sản phẩm (Màu & Phiên bản)</Label>
        <Button type="button" variant="outline" onClick={onAddVariant}>
          <Plus className="w-4 h-4 mr-2" /> Thêm màu
        </Button>
      </div>
      {variants.map((variant, vIdx) => (
        <div key={vIdx} className="rounded-md p-4 space-y-3 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Màu sắc <span className="text-red-500">*</span></Label>
              <Input
                placeholder="VD: Black"
                value={variant.color || ""}
                onChange={(e) => onVariantChange(vIdx, "color", e.target.value)}
                required
              />
            </div>
          </div>
          
          {/* URL Ảnh - Multi images */}
          <div className="space-y-2">
            <Label>URL ảnh (Mỗi màu có nhiều ảnh)</Label>
            {variant.images.map((img, imgIdx) => (
              <div key={imgIdx} className="flex items-center gap-2">
                <Input
                  placeholder="Nhập URL ảnh"
                  value={img}
                  onChange={(e) => onImageChange(vIdx, imgIdx, e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => onRemoveImage(vIdx, imgIdx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onAddImage(vIdx)}>
              <Plus className="w-4 h-4 mr-2" /> Thêm ảnh
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phiên bản:</Label>
            {variant.options.map((opt, oIdx) => (
              <div key={oIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-3 border rounded-md">
                <div className="space-y-2">
                  <Label>Tên phiên bản</Label>
                  <Input
                    placeholder="VD: Smart Folio 11 inch"
                    value={opt.variantName || ""}
                    onChange={(e) => onOptionChange(vIdx, oIdx, "variantName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá gốc</Label>
                  <Input type="number" value={opt.originalPrice || ""} onChange={(e) => onOptionChange(vIdx, oIdx, "originalPrice", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Giá bán</Label>
                  <Input type="number" value={opt.price || ""} onChange={(e) => onOptionChange(vIdx, oIdx, "price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" value={opt.stock || ""} onChange={(e) => onOptionChange(vIdx, oIdx, "stock", e.target.value)} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => onRemoveOption(vIdx, oIdx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => onAddOption(vIdx)}>
              <Plus className="w-4 h-4 mr-2" /> Thêm phiên bản
            </Button>
          </div>
          
          <Button type="button" variant="outline" onClick={() => onRemoveVariant(vIdx)}>
            <Trash2 className="w-4 h-4 mr-2" /> Xóa màu
          </Button>
        </div>
      ))}
    </div>
  );
};

export default AccessoriesVariantsForm;