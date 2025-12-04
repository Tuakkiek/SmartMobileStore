// frontend/src/components/shared/variants/UnifiedVariantsForm.jsx

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
import { toast } from "sonner";

/**
 * Form variants chung cho iPhone, iPad, Mac
 */
const UnifiedVariantsForm = ({
  category,
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
  const handleVariantOptionChange = (vIdx, oIdx, field, value) => {
    // Price validation
    if (field === "price" || field === "originalPrice") {
      const price =
        field === "price"
          ? Number(value)
          : Number(variants[vIdx].options[oIdx].price);
      const originalPrice =
        field === "originalPrice"
          ? Number(value)
          : Number(variants[vIdx].options[oIdx].originalPrice);
      if (price > originalPrice && originalPrice > 0) {
        toast.error(`Giá bán không được lớn hơn giá gốc`);
        return;
      }
    }
    onOptionChange(vIdx, oIdx, field, value);
  };

  // ✅ DEFINE OPTION FIELDS CONFIG
  const getOptionFields = () => {
    if (category === "iPhone") {
      return [
        {
          key: "storage",
          type: "select",
          label: "Bộ nhớ",
          options: ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
        },
      ];
    }

    if (category === "iPad") {
      return [
        {
          key: "storage",
          type: "select",
          label: "Bộ nhớ",
          options: ["128GB", "256GB", "512GB", "1TB", "2TB"],
          placeholder: "Chọn bộ nhớ",
        },
        {
          key: "connectivity",
          type: "select",
          label: "Kết nối",
          options: ["WIFI", "5G"],
          placeholder: "Chọn kết nối",
        },
      ];
    }

    if (category === "Mac") {
      return [
        {
          key: "cpuGpu",
          type: "input",
          label: "CPU – GPU",
          placeholder: "VD: 10 CPU – 10 GPU",
        },
        {
          key: "ram",
          type: "select",
          label: "RAM",
          options: ["8GB", "16GB", "24GB", "32GB", "64GB"],
        },
        {
          key: "storage",
          type: "select",
          label: "Bộ nhớ",
          options: ["256GB", "512GB", "1TB", "2TB"],
        },
      ];
    }

    return [];
  };

  const optionFields = getOptionFields();

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
          {/* COLOR INPUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Màu sắc <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="VD: Space Black / Silver"
                value={variant.color || ""}
                onChange={(e) => onVariantChange(vIdx, "color", e.target.value)}
                required
              />
            </div>
          </div>

          {/* IMAGES */}
          <div className="space-y-2">
            <Label>URL ảnh</Label>
            {variant.images.map((img, imgIdx) => (
              <div key={imgIdx} className="flex items-center gap-2">
                <Input
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

          {/* OPTIONS */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phiên bản:</Label>
            {variant.options.map((opt, oIdx) => (
              <div
                key={oIdx}
                className="grid gap-2 items-end p-3 border rounded-md"
                style={{
                  gridTemplateColumns: `repeat(${
                    optionFields.length + 4
                  }, minmax(0, 1fr))`,
                }}
              >
                {/* ✅ DYNAMIC OPTION FIELDS */}
                {optionFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>
                      {field.label} <span className="text-red-500">*</span>
                    </Label>
                    {field.type === "select" ? (
                      <Select
                        value={opt[field.key] || ""}
                        onValueChange={(v) =>
                          handleVariantOptionChange(vIdx, oIdx, field.key, v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={field.placeholder || field.label}
                          />
                        </SelectTrigger>

                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={field.placeholder}
                        value={opt[field.key] || ""}
                        onChange={(e) =>
                          handleVariantOptionChange(
                            vIdx,
                            oIdx,
                            field.key,
                            e.target.value
                          )
                        }
                        required
                      />
                    )}
                  </div>
                ))}

                {/* SKU, PRICE, STOCK */}
                <div className="space-y-2">
                  <Label>SKU (Tự động)</Label>
                  <Input
                    value={opt.sku || ""}
                    disabled
                    className="bg-gray-100"
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
                        ? "border-red-500"
                        : ""
                    }
                    required
                  />
                  {Number(opt.price) > Number(opt.originalPrice) &&
                    Number(opt.originalPrice) > 0 && (
                      <p className="text-xs text-red-500">
                        Giá bán phải ≤ giá gốc
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

export default UnifiedVariantsForm;
