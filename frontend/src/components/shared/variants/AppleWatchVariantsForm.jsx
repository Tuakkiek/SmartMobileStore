// ============================================
// FILE: src/components/shared/variants/AppleWatchVariantsForm.jsx
// ✅ NEW: VARIANTS FORM CHO APPLE WATCH - THỰC TẾ
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const AppleWatchVariantsForm = ({ variants, onVariantChange, onOptionChange, onAddVariant, onRemoveVariant, onAddOption, onRemoveOption }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Biến thể Apple Watch (Màu & Kích thước)</Label>
        <Button type="button" variant="outline" onClick={onAddVariant}>
          <Plus className="w-4 h-4 mr-2" /> Thêm màu
        </Button>
      </div>
      
      {variants.map((variant, vIdx) => (
        <div key={vIdx} className="rounded-md p-4 space-y-3 border">
          {/* MÀU + ẢNH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Màu <span className="text-red-500">*</span></Label>
              <Select 
                value={variant.color || ""} 
                onValueChange={(value) => onVariantChange(vIdx, "color", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn màu Apple Watch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Midnight">Midnight (Đen)</SelectItem>
                  <SelectItem value="Starlight">Starlight (Vàng nhạt)</SelectItem>
                  <SelectItem value="Silver">Silver (Bạc)</SelectItem>
                  <SelectItem value="Gold">Gold (Vàng)</SelectItem>
                  <SelectItem value="Rose Gold">Rose Gold (Hồng vàng)</SelectItem>
                  <SelectItem value="Graphite">Graphite (Xám)</SelectItem>
                  <SelectItem value="PRODUCT(RED)">PRODUCT(RED)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL ảnh màu</Label>
              <Input
                placeholder="https://example.com/watch-midnight.jpg"
                value={variant.imageUrl}
                onChange={(e) => onVariantChange(vIdx, "imageUrl", e.target.value)}
              />
            </div>
          </div>

          {/* KÍCH THƯỚC + PHIÊN BẢN */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Kích thước & Phiên bản:</Label>
            {variant.options.map((opt, oIdx) => (
              <div key={oIdx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 border rounded-md">
                {/* KÍCH THƯỚC */}
                <div className="space-y-2">
                  <Label>Kích thước</Label>
                  <Select value={opt.size || ""} onValueChange={(value) => onOptionChange(vIdx, oIdx, "size", value)}>
                    <SelectTrigger><SelectValue placeholder="Chọn kích thước" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="41mm">41mm</SelectItem>
                      <SelectItem value="45mm">45mm</SelectItem>
                      <SelectItem value="40mm">40mm</SelectItem>
                      <SelectItem value="44mm">44mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PHIÊN BẢN */}
                <div className="space-y-2">
                  <Label>Phiên bản</Label>
                  <Select value={opt.version || ""} onValueChange={(value) => onOptionChange(vIdx, oIdx, "version", value)}>
                    <SelectTrigger><SelectValue placeholder="Chọn phiên bản" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Series 9">Series 9</SelectItem>
                      <SelectItem value="Ultra 2">Ultra 2</SelectItem>
                      <SelectItem value="SE (2nd)">SE (2nd Gen)</SelectItem>
                      <SelectItem value="Series 8">Series 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* GPS / CELLULAR */}
                <div className="space-y-2">
                  <Label>Kết nối</Label>
                  <Select value={opt.connection || ""} onValueChange={(value) => onOptionChange(vIdx, oIdx, "connection", value)}>
                    <SelectTrigger><SelectValue placeholder="Chọn kết nối" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GPS">GPS</SelectItem>
                      <SelectItem value="GPS + Cellular">GPS + Cellular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* GIÁ GỐC */}
                <div className="space-y-2">
                  <Label>Giá gốc</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={opt.originalPrice} 
                    onChange={(e) => onOptionChange(vIdx, oIdx, "originalPrice", e.target.value)} 
                  />
                </div>

                {/* GIÁ BÁN */}
                <div className="space-y-2">
                  <Label>Giá bán <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={opt.price} 
                    onChange={(e) => onOptionChange(vIdx, oIdx, "price", e.target.value)} 
                    required
                  />
                </div>

                {/* SỐ LƯỢNG */}
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={opt.quantity} 
                    onChange={(e) => onOptionChange(vIdx, oIdx, "quantity", e.target.value)} 
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => onRemoveOption(vIdx, oIdx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <Button type="button" variant="outline" onClick={() => onAddOption(vIdx)}>
              <Plus className="w-4 h-4 mr-2" /> Thêm kích thước
            </Button>
          </div>

          {/* XÓA MÀU */}
          <Button type="button" variant="outline" onClick={() => onRemoveVariant(vIdx)}>
            <Trash2 className="w-4 h-4 mr-2" /> Xóa màu
          </Button>
        </div>
      ))}
    </div>
  );
};

export default AppleWatchVariantsForm;