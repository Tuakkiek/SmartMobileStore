// ============================================
// FILE: src/components/shared/specs/MacSpecsForm.jsx
// ✅ SPECS FORM CHO MAC - KHỚP MODEL
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const MacSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* TAB THÔNG SỐ MAC - KHÔNG CÓ CAMERA */}
      <div className="space-y-2">
        <Label>Chip</Label>
        <Input 
          value={specs.chip || ""} 
          onChange={(e) => onChange("chip", e.target.value)} 
          placeholder="VD: M3 Pro"
        />
      </div>
      <div className="space-y-2">
        <Label>GPU</Label>
        <Input 
          value={specs.gpu || ""} 
          onChange={(e) => onChange("gpu", e.target.value)} 
          placeholder="VD: 14-core GPU"
        />
      </div>
      <div className="space-y-2">
        <Label>Dung lượng RAM</Label>
        <Input 
          value={specs.ram || ""} 
          onChange={(e) => onChange("ram", e.target.value)} 
          placeholder="VD: 18GB"
        />
      </div>
      <div className="space-y-2">
        <Label>Bộ nhớ trong</Label>
        <Input 
          value={specs.storage || ""} 
          onChange={(e) => onChange("storage", e.target.value)} 
          placeholder="VD: 512GB SSD"
        />
      </div>
      <div className="space-y-2">
        <Label>Kích thước màn hình</Label>
        <Input 
          value={specs.screenSize || ""} 
          onChange={(e) => onChange("screenSize", e.target.value)} 
          placeholder="VD: 14 inch"
        />
      </div>
      <div className="space-y-2">
        <Label>Độ phân giải màn hình</Label>
        <Input 
          value={specs.screenResolution || ""} 
          onChange={(e) => onChange("screenResolution", e.target.value)} 
          placeholder="VD: 3024x1964"
        />
      </div>
      <div className="space-y-2">
        <Label>Pin</Label>
        <Input 
          value={specs.battery || ""} 
          onChange={(e) => onChange("battery", e.target.value)} 
          placeholder="VD: 22 giờ sử dụng"
        />
      </div>
      <div className="space-y-2">
        <Label>Hệ điều hành</Label>
        <Input 
          value={specs.os || ""} 
          onChange={(e) => onChange("os", e.target.value)} 
          placeholder="VD: macOS Sonoma"
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
                placeholder="VD: Space Gray"
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

export default MacSpecsForm;