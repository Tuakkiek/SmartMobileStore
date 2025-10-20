// ============================================
// FILE: src/components/shared/variants/MacVariantsForm.jsx
// ✅ NEW: VARIANTS FORM CHO MAC
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const MacVariantsForm = ({ variants, onVariantChange, onOptionChange, onAddVariant, onRemoveVariant, onAddOption, onRemoveOption }) => {
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
              <Label>Màu <span className="text-red-500">*</span></Label>
              <Input
                placeholder="VD: Space Gray"
                value={variant.color}
                onChange={(e) => onVariantChange(vIdx, "color", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>URL ảnh màu</Label>
              <Input
                placeholder="Nhập URL ảnh"
                value={variant.imageUrl}
                onChange={(e) => onVariantChange(vIdx, "imageUrl", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phiên bản cấu hình:</Label>
            {variant.options.map((opt, oIdx) => (
              <div key={oIdx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 border rounded-md">
                <div className="space-y-2">
                  <Label>CPU – GPU</Label>
                  <Input
                    placeholder="VD: M3 Pro 11-core CPU, 14-core GPU"
                    value={opt.cpuGpu}
                    onChange={(e) => onOptionChange(vIdx, oIdx, "cpuGpu", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RAM</Label>
                  <Select value={opt.ram || ""} onValueChange={(value) => onOptionChange(vIdx, oIdx, "ram", value)}>
                    <SelectTrigger><SelectValue placeholder="Chọn RAM" /></SelectTrigger>
                    <SelectContent>
                      {["8GB", "16GB", "32GB", "64GB"].map((ram) => (
                        <SelectItem key={ram} value={ram}>{ram}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bộ nhớ trong</Label>
                  <Select value={opt.storage || ""} onValueChange={(value) => onOptionChange(vIdx, oIdx, "storage", value)}>
                    <SelectTrigger><SelectValue placeholder="Chọn bộ nhớ" /></SelectTrigger>
                    <SelectContent>
                      {["512GB", "1TB", "2TB"].map((storage) => (
                        <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Giá gốc</Label>
                  <Input type="number" value={opt.originalPrice} onChange={(e) => onOptionChange(vIdx, oIdx, "originalPrice", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Giá bán</Label>
                  <Input type="number" value={opt.price} onChange={(e) => onOptionChange(vIdx, oIdx, "price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" value={opt.quantity} onChange={(e) => onOptionChange(vIdx, oIdx, "quantity", e.target.value)} />
                </div>
                <Button type="button" variant="outline" onClick={() => onRemoveOption(vIdx, oIdx)}>
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

export default MacVariantsForm;