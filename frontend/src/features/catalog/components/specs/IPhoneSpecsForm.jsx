// ============================================
// FILE: src/components/shared/specs/IPhoneSpecsForm.jsx
// ✅ SPECS FORM CHO IPHONE - KHỚP MODEL
// ============================================

import React from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Trash2, Plus } from "lucide-react";

const IPhoneSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* TAB THÔNG SỐ IPHONE */}
      <div className="space-y-2">
        <Label>Chip</Label>
        <Input 
          value={specs.chip || ""} 
          onChange={(e) => onChange("chip", e.target.value)} 
          placeholder="VD: A18 Bionic"
        />
      </div>
      <div className="space-y-2">
        <Label>Dung lượng RAM</Label>
        <Input 
          value={specs.ram || ""} 
          onChange={(e) => onChange("ram", e.target.value)} 
          placeholder="VD: 8GB"
        />
      </div>
      <div className="space-y-2">
        <Label>Bộ nhớ trong</Label>
        <Input 
          value={specs.storage || ""} 
          onChange={(e) => onChange("storage", e.target.value)} 
          placeholder="VD: 128GB/256GB/512GB"
        />
      </div>
      <div className="space-y-2">
        <Label>Camera trước</Label>
        <Input 
          value={specs.frontCamera || ""} 
          onChange={(e) => onChange("frontCamera", e.target.value)} 
          placeholder="VD: 12MP TrueDepth"
        />
      </div>
      <div className="space-y-2">
        <Label>Camera sau</Label>
        <Input 
          value={specs.rearCamera || ""} 
          onChange={(e) => onChange("rearCamera", e.target.value)} 
          placeholder="VD: 48MP + 12MP"
        />
      </div>
      <div className="space-y-2">
        <Label>Kích thước màn hình</Label>
        <Input 
          value={specs.screenSize || ""} 
          onChange={(e) => onChange("screenSize", e.target.value)} 
          placeholder="VD: 6.7 inch"
        />
      </div>
      <div className="space-y-2">
        <Label>Công nghệ màn hình</Label>
        <Input 
          value={specs.screenTech || ""} 
          onChange={(e) => onChange("screenTech", e.target.value)} 
          placeholder="VD: Super Retina XDR"
        />
      </div>
      <div className="space-y-2">
        <Label>Pin</Label>
        <Input 
          value={specs.battery || ""} 
          onChange={(e) => onChange("battery", e.target.value)} 
          placeholder="VD: 4,685mAh"
        />
      </div>
      <div className="space-y-2">
        <Label>Hệ điều hành</Label>
        <Input 
          value={specs.os || ""} 
          onChange={(e) => onChange("os", e.target.value)} 
          placeholder="VD: iOS 18"
        />
      </div>
      
      {/* MÀU SẮC - DYNAMIC ARRAY */}
      <div className="space-y-2 col-span-full">
        <Label>Màu sắc</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Space Black"
                className="w-32"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => onRemoveColor(idx)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onAddColor}>
            <Plus className="w-3 h-3 mr-1" /> Thêm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IPhoneSpecsForm;