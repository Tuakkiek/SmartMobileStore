// ============================================
// ✅ FILE: src/components/shared/variants/IPadVariantsForm.jsx
// ✅ FORM TẠO BIẾN THỂ iPad - KHỚP VỚI MÔ HÌNH IPadVariant TRONG BACKEND
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

// 🧩 Import hàm sinh SKU tự động
import { generateSKU } from "@/lib/generateSKU";

const IPadVariantsForm = ({
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
  // 🆕 Thêm 2 props để dùng trong SKU (nếu có)
  category = "iPad",
  model = "",
}) => {
  // 🧠 Hàm cập nhật SKU tự động mỗi khi thay đổi option
  const handleOptionChange = (vIdx, oIdx, field, value) => {
    onOptionChange(vIdx, oIdx, field, value);

    const variant = variants[vIdx];
    const option = variant.options[oIdx];

    // Lấy dữ liệu hiện tại
    const color = variant.color || "";
    const storage = field === "storage" ? value : option.storage || "";
    const connectivity =
      field === "connectivity" ? value : option.connectivity || "";

    // Nếu có đủ dữ kiện thì sinh SKU
    if (color && storage && connectivity) {
      const sku = generateSKU(category, model, color, storage, connectivity);
      onOptionChange(vIdx, oIdx, "sku", sku);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">
          Biến thể sản phẩm (Màu & Phiên bản)
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddVariant}>
          <Plus className="w-4 h-4 mr-2" /> Thêm màu mới
        </Button>
      </div>

      {/* Danh sách các biến thể */}
      {variants.map((variant, vIdx) => (
        <div
          key={vIdx}
          className="rounded-lg p-5 space-y-4 border bg-gray-50 shadow-sm"
        >
          {/* MÀU SẮC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Màu sắc <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="VD: Vàng, Bạc, Hồng, Xanh"
                value={variant.color || ""}
                onChange={(e) => onVariantChange(vIdx, "color", e.target.value)}
                required
              />
            </div>
          </div>

          {/* HÌNH ẢNH */}
          <div className="space-y-2">
            <Label>URL ảnh (thêm nhiều ảnh cho mỗi màu)</Label>
            {variant.images?.map((img, imgIdx) => (
              <div key={imgIdx} className="flex items-center gap-3">
                <Input
                  placeholder="Nhập URL ảnh"
                  value={img}
                  onChange={(e) => onImageChange(vIdx, imgIdx, e.target.value)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
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

          {/* CÁC PHIÊN BẢN (storage + connectivity) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Phiên bản (Dung lượng & Kết nối)
            </Label>
            {variant.options?.map((opt, oIdx) => (
              <div
                key={oIdx}
                className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end p-4 border rounded-md bg-white"
              >
                {/* STORAGE */}
                <div className="space-y-2">
                  <Label>Bộ nhớ</Label>
                  <Select
                    value={opt.storage || ""}
                    onValueChange={(value) =>
                      handleOptionChange(vIdx, oIdx, "storage", value)
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

                {/* CONNECTIVITY */}
                <div className="space-y-2">
                  <Label>Kết nối</Label>
                  <Select
                    value={opt.connectivity || ""}
                    onValueChange={(value) =>
                      handleOptionChange(vIdx, oIdx, "connectivity", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kết nối" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WIFI">Wi-Fi</SelectItem>
                      <SelectItem value="5G">5G</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* GIÁ */}
                <div className="space-y-2">
                  <Label>Giá gốc (VNĐ)</Label>
                  <Input
                    type="number"
                    value={opt.originalPrice || ""}
                    onChange={(e) =>
                      onOptionChange(
                        vIdx,
                        oIdx,
                        "originalPrice",
                        e.target.value
                      )
                    }
                    placeholder="VD: 9990000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá bán (VNĐ)</Label>
                  <Input
                    type="number"
                    value={opt.price || ""}
                    onChange={(e) =>
                      onOptionChange(
                        vIdx,
                        oIdx,
                        "price",
                        e.target.value
                      )
                    }
                    placeholder="VD: 9090000"
                  />
                </div>

                {/* TỒN KHO */}
                <div className="space-y-2">
                  <Label>Tồn kho</Label>
                  <Input
                    type="number"
                    value={opt.stock || ""}
                    onChange={(e) =>
                      onOptionChange(
                        vIdx,
                        oIdx,
                        "stock",
                        e.target.value
                      )
                    }
                    placeholder="VD: 30"
                  />
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={opt.sku || ""}
                    onChange={(e) =>
                      onOptionChange(vIdx, oIdx, "sku", e.target.value)
                    }
                    placeholder="Tự động tạo hoặc nhập thủ công"
                  />
                </div>

                {/* Nút xóa */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => onRemoveOption(vIdx, oIdx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddOption(vIdx)}
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm phiên bản
            </Button>
          </div>

          {/* XÓA MÀU */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemoveVariant(vIdx)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Xóa màu này
          </Button>
        </div>
      ))}
    </div>
  );
};

export default IPadVariantsForm;