// ============================================
// FILE: src/components/shared/variants/AppleWatchVariantsForm.jsx
// ✅ VARIANTS FORM CHO APPLE WATCH - ĐỒNG BỘ VỚI MULTI-IMAGES
// ============================================

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { generateSKU } from "@/lib/generateSKU";

const AppleWatchVariantsForm = ({
  variants,
  onAddVariant,
  onRemoveVariant,
  onVariantChange,
  onImageChange,
  onAddImage,
  onRemoveImage,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  model,
}) => {
  // Tự động tạo SKU khi color, variantName hoặc bandSize thay đổi
  useEffect(() => {
    variants.forEach((variant, vIdx) => {
      variant.options.forEach((option, oIdx) => {
        if (variant.color && option.variantName && option.bandSize && !option.sku) {
          const newSKU = generateSKU(
            "AppleWatch",
            model || "UNKNOWN",
            variant.color,
            {
              variantName: option.variantName,
              bandSize: option.bandSize,
            }
          );
          onOptionChange(vIdx, oIdx, "sku", newSKU);
        }
      });
    });
  }, [variants, model, onOptionChange]);

  const handleLocalOptionChange = (vIdx, oIdx, field, value) => {
    onOptionChange(vIdx, oIdx, field, value);

    const variant = variants[vIdx];
    const option = variant.options[oIdx];

    const color = variant.color || "";
    const variantName = field === "variantName" ? value : option.variantName || "";
    const bandSize = field === "bandSize" ? value : option.bandSize || "";

    if (color && variantName && bandSize) {
      const newSKU = generateSKU(
        "AppleWatch",
        model || "UNKNOWN",
        color,
        { variantName, bandSize }
      );
      onOptionChange(vIdx, oIdx, "sku", newSKU);
    }
  };

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
              <Select 
                value={variant.color || ""}
                onValueChange={(value) => {
                  onVariantChange(vIdx, "color", value);
                  // Tự động cập nhật SKU cho tất cả options khi màu thay đổi
                  variant.options.forEach((option, oIdx) => {
                    if (option.variantName && option.bandSize) {
                      const newSKU = generateSKU(
                        "AppleWatch",
                        model || "UNKNOWN",
                        value,
                        {
                          variantName: option.variantName,
                          bandSize: option.bandSize,
                        }
                      );
                      onOptionChange(vIdx, oIdx, "sku", newSKU);
                    }
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn màu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Midnight">Midnight</SelectItem>
                  <SelectItem value="Starlight">Starlight</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="PRODUCT(RED)">PRODUCT(RED)</SelectItem>
                  <SelectItem value="Blue">Blue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* URL Ảnh - Multi images */}
          <div className="space-y-2">
            <Label>URL ảnh</Label>
            {variant.images.map((img, imgIdx) => (
              <div key={imgIdx} className="flex items-center gap-2">
                <Input
                  placeholder="Nhập URL ảnh"
                  value={img}
                  onChange={(e) => onImageChange(vIdx, imgIdx, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveImage(vIdx, imgIdx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddImage(vIdx)}
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm ảnh
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Phiên bản:</Label>
            {variant.options.map((opt, oIdx) => (
              <div
                key={oIdx}
                className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 border rounded-md"
              >
                <div className="space-y-2">
                  <Label>Tên biến thể <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="VD: GPS 40mm"
                    value={opt.variantName || ""}
                    onChange={(e) => handleLocalOptionChange(vIdx, oIdx, "variantName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kích cỡ dây <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="VD: S/M"
                    value={opt.bandSize || ""}
                    onChange={(e) => handleLocalOptionChange(vIdx, oIdx, "bandSize", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    placeholder="VD: APPLEWATCH-SERIES10-MIDNIGHT-GPS40MM-SM"
                    value={opt.sku || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "sku", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá gốc</Label>
                  <Input
                    type="number"
                    value={opt.originalPrice || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "originalPrice", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá bán</Label>
                  <Input
                    type="number"
                    value={opt.price || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "price", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input
                    type="number"
                    value={opt.stock || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "stock", e.target.value)
                    }
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveOption(vIdx, oIdx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => onAddOption(vIdx)}
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm phiên bản
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onRemoveVariant(vIdx)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Xóa màu
          </Button>
        </div>
      ))}
    </div>
  );
};

export default AppleWatchVariantsForm;