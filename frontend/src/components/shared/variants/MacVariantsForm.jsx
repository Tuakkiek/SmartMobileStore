// ============================================
// FILE: src/components/shared/variants/MacVariantsForm.jsx
// ✅ VARIANTS FORM CHO MAC - ĐỒNG BỘ VỚI MULTI-IMAGES
// ============================================

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { generateSKU } from "@/lib/generateSKU";

const MacVariantsForm = ({
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
  // Tự động tạo SKU khi color, cpuGpu, ram hoặc storage thay đổi
  useEffect(() => {
    variants.forEach((variant, vIdx) => {
      variant.options.forEach((option, oIdx) => {
        if (variant.color && option.cpuGpu && option.ram && option.storage && !option.sku) {
          const newSKU = generateSKU(
            "Mac",
            model || "UNKNOWN",
            variant.color,
            {
              cpuGpu: option.cpuGpu,
              ram: option.ram,
              storage: option.storage,
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
    const cpuGpu = field === "cpuGpu" ? value : option.cpuGpu || "";
    const ram = field === "ram" ? value : option.ram || "";
    const storage = field === "storage" ? value : option.storage || "";

    if (color && cpuGpu && ram && storage) {
      const newSKU = generateSKU(
        "Mac",
        model || "UNKNOWN",
        color,
        { cpuGpu, ram, storage }
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
              <Input
                placeholder="VD: Space Gray"
                value={variant.color || ""}
                onChange={(e) => {
                  onVariantChange(vIdx, "color", e.target.value);
                  // Tự động cập nhật SKU cho tất cả options khi màu thay đổi
                  variant.options.forEach((option, oIdx) => {
                    if (option.cpuGpu && option.ram && option.storage) {
                      const newSKU = generateSKU(
                        "Mac",
                        model || "UNKNOWN",
                        e.target.value,
                        {
                          cpuGpu: option.cpuGpu,
                          ram: option.ram,
                          storage: option.storage,
                        }
                      );
                      onOptionChange(vIdx, oIdx, "sku", newSKU);
                    }
                  });
                }}
                required
              />
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
                className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end p-3 border rounded-md"
              >
                <div className="space-y-2">
                  <Label>CPU – GPU <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="VD: 10 CPU – 10 GPU"
                    value={opt.cpuGpu || ""}
                    onChange={(e) => handleLocalOptionChange(vIdx, oIdx, "cpuGpu", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>RAM <span className="text-red-500">*</span></Label>
                  <Select
                    value={opt.ram || ""}
                    onValueChange={(value) => handleLocalOptionChange(vIdx, oIdx, "ram", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn RAM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8GB">8GB</SelectItem>
                      <SelectItem value="16GB">16GB</SelectItem>
                      <SelectItem value="24GB">24GB</SelectItem>
                      <SelectItem value="32GB">32GB</SelectItem>
                      <SelectItem value="64GB">64GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bộ nhớ trong <span className="text-red-500">*</span></Label>
                  <Select
                    value={opt.storage || ""}
                    onValueChange={(value) => handleLocalOptionChange(vIdx, oIdx, "storage", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bộ nhớ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="256GB">256GB</SelectItem>
                      <SelectItem value="512GB">512GB</SelectItem>
                      <SelectItem value="1TB">1TB</SelectItem>
                      <SelectItem value="2TB">2TB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    placeholder="VD: MAC-MACBOOKPRO-SPACEGRAY-10CPU10GPU-16GB-512GB"
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

export default MacVariantsForm;