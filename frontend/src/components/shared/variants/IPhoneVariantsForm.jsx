import React, { useEffect } from "react";
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
import { generateSKU } from "@/lib/generateSKU";
import { toast } from "sonner";

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
  model,
}) => {
  useEffect(() => {
    variants.forEach((variant, vIdx) => {
      variant.options.forEach((option, oIdx) => {
        if (variant.color && option.storage && !option.sku) {
          const newSKU = generateSKU(
            "iPhone",
            model || "UNKNOWN",
            variant.color,
            option.storage
          );
          onOptionChange(vIdx, oIdx, "sku", newSKU);
        }
      });
    });
  }, [variants, model, onOptionChange]);

  const handleVariantOptionChange = (vIdx, oIdx, field, value) => {
    const variantsCopy = [...variants];
    const option = variantsCopy[vIdx].options[oIdx];

    if (field === "price" || field === "originalPrice") {
      const price = field === "price" ? Number(value) : Number(option.price);
      const originalPrice =
        field === "originalPrice"
          ? Number(value)
          : Number(option.originalPrice);

      if (price > originalPrice && originalPrice > 0) {
        toast.error(
          `Giá bán (${price.toLocaleString()}đ) không được lớn hơn giá gốc (${originalPrice.toLocaleString()}đ)`
        );
        return;
      }
    }

    onOptionChange(vIdx, oIdx, field, value);
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
              <Label>
                Màu sắc <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="VD: Space Black"
                value={variant.color || ""}
                onChange={(e) => {
                  onVariantChange(vIdx, "color", e.target.value);
                  variant.options.forEach((opt, oIdx) => {
                    if (opt.storage) {
                      const newSKU = generateSKU(
                        "iPhone",
                        model || "UNKNOWN",
                        e.target.value,
                        opt.storage
                      );
                      onOptionChange(vIdx, oIdx, "sku", newSKU);
                    }
                  });
                }}
                required
              />
            </div>
          </div>

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
                className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 border rounded-md"
              >
                <div className="space-y-2">
                  <Label>
                    Bộ nhớ trong <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={opt.storage || ""}
                    onValueChange={(value) => {
                      handleVariantOptionChange(vIdx, oIdx, "storage", value);
                      if (variant.color && value) {
                        const newSKU = generateSKU(
                          "iPhone",
                          model || "UNKNOWN",
                          variant.color,
                          value
                        );
                        onOptionChange(vIdx, oIdx, "sku", newSKU);
                      }
                    }}
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

                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    placeholder="VD: IPHONE-IPHONE16PROMAX-SPACEBLACK-256GB"
                    value={opt.sku || ""}
                    onChange={(e) =>
                      handleVariantOptionChange(
                        vIdx,
                        oIdx,
                        "sku",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Giá gốc <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={opt.originalPrice || ""}
                    onChange={(e) =>
                      handleVariantOptionChange(
                        vIdx,
                        oIdx,
                        "originalPrice",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Giá bán <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={opt.price || ""}
                    onChange={(e) =>
                      handleVariantOptionChange(
                        vIdx,
                        oIdx,
                        "price",
                        e.target.value
                      )
                    }
                    className={
                      Number(opt.price) > Number(opt.originalPrice) &&
                      Number(opt.originalPrice) > 0
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
                    required
                  />
                  {Number(opt.price) > Number(opt.originalPrice) &&
                    Number(opt.originalPrice) > 0 && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span>Warning</span> Giá bán phải nhỏ hơn hoặc bằng giá
                        gốc
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input
                    type="number"
                    value={opt.stock || ""}
                    onChange={(e) =>
                      handleVariantOptionChange(
                        vIdx,
                        oIdx,
                        "stock",
                        e.target.value
                      )
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

export default IPhoneVariantsForm;
