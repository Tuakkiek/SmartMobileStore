// ============================================
// FILE: src/components/shared/variants/IPhoneVariantsForm.jsx
// ✅ CORRECT: type="number" MATCHES BACKEND Number SCHEMA
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const IPhoneVariantsForm = ({
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
}) => {
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
              <Label>
                Màu <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="VD: Space Black"
                value={variant.color || ""}
                onChange={(e) => onVariantChange(vIdx, "color", e.target.value)}
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
            <Label className="text-sm font-medium">
              Phiên bản bộ nhớ trong:
            </Label>
            {variant.options.map((opt, oIdx) => (
              <div
                key={oIdx}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end p-3 border rounded-md"
              >
                <div className="space-y-2">
                  <Label>Bộ nhớ trong</Label>
                  <Select
                    value={opt.storage || ""}
                    onValueChange={(value) =>
                      onOptionChange(vIdx, oIdx, "storage", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bộ nhớ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128GB">128GB</SelectItem>
                      <SelectItem value="256GB">256GB</SelectItem>
                      <SelectItem value="512GB">512GB</SelectItem>
                      <SelectItem value="1TB">1TB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SKU</Label>
                  <Input
                    value={opt.sku || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "sku", e.target.value)
                    }
                    className="text-sm"
                    placeholder="VD: IPH-AIR-256-BLUE"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá gốc</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={opt.originalPrice || ""}
                    onChange={(e) =>
                      onOptionChange(
                        vIdx,
                        oIdx,
                        "originalPrice",
                        e.target.value
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá bán</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={opt.price || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "price", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input
                    type="number"
                    min="0"
                    value={opt.stock || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "stock", e.target.value)
                    }
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

export default IPhoneVariantsForm;
