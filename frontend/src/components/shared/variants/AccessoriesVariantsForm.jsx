import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Tag,
  Zap,
  Archive,
  Image,
  Minimize2,
} from "lucide-react"; // Import thêm icon
import { toast } from "sonner";

const AccessoriesVariantsForm = ({
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
    // Logic kiểm tra giá vẫn giữ nguyên
    if (field === "price" || field === "originalPrice") {
      const priceValue =
        field === "price"
          ? Number(value)
          : Number(variants[vIdx].options[oIdx].price || 0);
      const originalPriceValue =
        field === "originalPrice"
          ? Number(value)
          : Number(variants[vIdx].options[oIdx].originalPrice || 0);

      if (priceValue > originalPriceValue && originalPriceValue > 0) {
        toast.error(`Giá bán không được lớn hơn giá gốc`);
        return;
      }
    }
    onOptionChange(vIdx, oIdx, field, value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
        </h3>
        <Button
          type="button"
          onClick={onAddVariant}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Thêm Màu sắc
        </Button>
      </div>

      {variants.map((variant, vIdx) => (
        <div
          key={vIdx}
          className="rounded-xl p-5 space-y-5 border border-gray-200 shadow-md transition-all duration-300 hover:border-blue-300"
        >
          {/* TIÊU ĐỀ MÀU SẮC VÀ NÚT XÓA */}
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="space-y-1 w-1/2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" /> Tên Màu sắc{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="VD: Midnight (Đen)"
                value={variant.color || ""}
                onChange={(e) => onVariantChange(vIdx, "color", e.target.value)}
                required
                className="text-lg font-medium"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRemoveVariant(vIdx)}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Xóa Màu
            </Button>
          </div>

          {/* QUẢN LÝ ẢNH CỦA MÀU SẮC */}
          <div className="space-y-3 pt-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Image className="w-4 h-4 text-green-600" /> URL Ảnh (Hiển thị cho
              màu này)
            </Label>
            {variant.images.map((img, imgIdx) => (
              <div key={imgIdx} className="flex items-center gap-2">
                <Input
                  placeholder="Nhập URL ảnh (VD: https://storage.com/case_black.jpg)"
                  value={img}
                  onChange={(e) => onImageChange(vIdx, imgIdx, e.target.value)}
                  className="flex-1"
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
              className="mt-2 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm Ảnh cho Màu "
              {variant.color || "Mới"}"
            </Button>
          </div>

          {/* QUẢN LÝ CÁC PHIÊN BẢN (OPTIONS) */}
          <div className="space-y-4 pt-4 border-t border-dashed">
            <h4 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
              <Minimize2 className="w-4 h-4" /> Các Phiên bản con (Tương
              thích/Kích cỡ)
            </h4>

            {variant.options.map((opt, oIdx) => (
              <div
                key={oIdx}
                className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end p-4 border rounded-lg bg-white shadow-inner"
              >
                {/* Cột 1: TÊN PHIÊN BẢN/TƯƠNG THÍCH */}
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium">
                    Tên mẫu/Tương thích <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="VD: Smart Folio 11 inch (iPad Pro 2024)"
                    value={opt.variantName || ""}
                    onChange={(e) =>
                      handleVariantOptionChange(
                        vIdx,
                        oIdx,
                        "variantName",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                {/* Cột 2: SKU */}
                <div className="space-y-2 col-span-1">
                  <Label className="text-sm font-medium">SKU</Label>
                  <Input
                    value={opt.sku || "Tự động tạo"}
                    disabled
                    className="bg-gray-100 italic"
                  />
                </div>

                {/* Cột 3: GIÁ GỐC */}
                <div className="space-y-2 col-span-1">
                  <Label className="text-sm font-medium">
                    Giá gốc <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
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

                {/* Cột 4: GIÁ BÁN */}
                <div className="space-y-2 col-span-1">
                  <Label className="text-sm font-medium">
                    Giá bán <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
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
                        ? "border-red-500 ring-red-500"
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

                {/* Cột 5: SỐ LƯỢNG */}
                <div className="space-y-2 col-span-1">
                  <Label className="text-sm font-medium">
                    <Archive className="w-3 h-3 inline mr-1" /> Tồn kho
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
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

                {/* Cột 6: NÚT XÓA PHIÊN BẢN */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveOption(vIdx, oIdx)}
                    className="text-red-500 hover:bg-red-50"
                    title="Xóa phiên bản này"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* NÚT THÊM PHIÊN BẢN CON */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onAddOption(vIdx)}
              className="mt-2 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm Phiên bản con
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccessoriesVariantsForm;
