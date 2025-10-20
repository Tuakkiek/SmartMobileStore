// ============================================
// FILE: src/components/shared/specs/AirPodsSpecsForm.jsx
// ✅ NEW: SPECS FORM CHO AIRPODS
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const AirPodsSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Chipset</Label>
        <Input value={specs.chipset || ""} onChange={(e) => onChange("chipset", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Thương hiệu</Label>
        <Input value={specs.brand || ""} onChange={(e) => onChange("brand", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Công nghệ âm thanh</Label>
        <Input value={specs.audioTechnology || ""} onChange={(e) => onChange("audioTechnology", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Thời lượng Pin</Label>
        <Input value={specs.batteryLife || ""} onChange={(e) => onChange("batteryLife", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Phương thức điều khiển</Label>
        <Input value={specs.controlMethod || ""} onChange={(e) => onChange("controlMethod", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Micro</Label>
        <Input value={specs.microphone || ""} onChange={(e) => onChange("microphone", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Cổng kết nối</Label>
        <Input value={specs.connectionPort || ""} onChange={(e) => onChange("connectionPort", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Tính năng khác</Label>
        <Input value={specs.otherFeatures || ""} onChange={(e) => onChange("otherFeatures", e.target.value)} />
      </div>
      <div className="space-y-2 col-span-2">
        <Label>Màu sắc</Label>
        <div className="flex flex-wrap gap-2">
          {specs.colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: White"
              />
              <Button type="button" variant="outline" onClick={() => onRemoveColor(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={onAddColor}>
            <Plus className="w-4 h-4 mr-2" /> Thêm màu
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AirPodsSpecsForm;