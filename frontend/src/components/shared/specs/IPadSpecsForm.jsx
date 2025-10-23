// ============================================
// FILE: src/components/shared/specs/IPadSpecsForm.jsx
// ✅ SPECS FORM CHO IPAD - KHỚP MODEL VÀ THIẾT KẾ SẠCH SẼ
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const IPadSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="space-y-2">
        <Label>Chip xử lý <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.chip || ""} 
          onChange={(e) => onChange("chip", e.target.value)} 
          placeholder="VD: A16 Bionic"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>RAM <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.ram || ""} 
          onChange={(e) => onChange("ram", e.target.value)} 
          placeholder="VD: 6GB"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Bộ nhớ trong <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.storage || ""} 
          onChange={(e) => onChange("storage", e.target.value)} 
          placeholder="VD: 128GB / 256GB / 512GB"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Camera trước <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.frontCamera || ""} 
          onChange={(e) => onChange("frontCamera", e.target.value)} 
          placeholder="VD: 12MP Ultra Wide"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Camera sau <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.rearCamera || ""} 
          onChange={(e) => onChange("rearCamera", e.target.value)} 
          placeholder="VD: 12MP Wide"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Kích thước màn hình <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.screenSize || ""} 
          onChange={(e) => onChange("screenSize", e.target.value)} 
          placeholder="VD: 11 inch"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Công nghệ màn hình <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.screenTech || ""} 
          onChange={(e) => onChange("screenTech", e.target.value)} 
          placeholder="VD: Liquid Retina"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Pin <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.battery || ""} 
          onChange={(e) => onChange("battery", e.target.value)} 
          placeholder="VD: Lên đến 10 giờ sử dụng"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Hệ điều hành <span className="text-red-500">*</span></Label>
        <Input 
          value={specs.os || ""} 
          onChange={(e) => onChange("os", e.target.value)} 
          placeholder="VD: iPadOS 18"
          required
        />
      </div>
      
      {/* MÀU SẮC - MẢNG ĐỘNG VỚI XÓA/THÊM */}
      <div className="space-y-3 col-span-full">
        <Label>Màu sắc</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Silver"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="destructive" 
                size="icon"
                onClick={() => onRemoveColor(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddColor} className="mt-2">
          <Plus className="w-4 h-4 mr-2" /> Thêm màu
        </Button>
      </div>
    </div>
  );
};

export default IPadSpecsForm;