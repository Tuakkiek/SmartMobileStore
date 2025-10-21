// ============================================
// FILE: src/components/shared/specs/AirPodsSpecsForm.jsx
// ✅ SPECS FORM CHO AIRPODS - KHỚP MODEL
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const AirPodsSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* TAB THÔNG SỐ AIRPODS - KHÔNG CÓ MÀU SẮC RIÊNG */}
      <div className="space-y-2">
        <Label>Chip</Label>
        <Input 
          value={specs.chip || ""} 
          onChange={(e) => onChange("chip", e.target.value)} 
          placeholder="VD: H2"
        />
      </div>
      <div className="space-y-2">
        <Label>Thương hiệu</Label>
        <Input 
          value={specs.brand || ""} 
          onChange={(e) => onChange("brand", e.target.value)} 
          placeholder="VD: Apple"
        />
      </div>
      <div className="space-y-2">
        <Label>Thời lượng Pin</Label>
        <Input 
          value={specs.batteryLife || ""} 
          onChange={(e) => onChange("batteryLife", e.target.value)} 
          placeholder="VD: 6 giờ nghe + 30 giờ hộp sạc"
        />
      </div>
      <div className="space-y-2">
        <Label>Chống nước</Label>
        <Input 
          value={specs.waterResistance || ""} 
          onChange={(e) => onChange("waterResistance", e.target.value)} 
          placeholder="VD: IP54"
        />
      </div>
      <div className="space-y-2">
        <Label>Bluetooth</Label>
        <Input 
          value={specs.bluetooth || ""} 
          onChange={(e) => onChange("bluetooth", e.target.value)} 
          placeholder="VD: 5.3"
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
                placeholder="VD: White"
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

export default AirPodsSpecsForm;