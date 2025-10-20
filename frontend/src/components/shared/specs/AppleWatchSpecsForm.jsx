// ============================================
// FILE: src/components/shared/specs/AppleWatchSpecsForm.jsx
// ✅ NEW: SPECS FORM CHO APPLE WATCH (tùy chỉnh theo yêu cầu)
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const AppleWatchSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Kích thước vỏ</Label>
        <Input value={specs.caseSize || ""} onChange={(e) => onChange("caseSize", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Chất liệu vỏ</Label>
        <Input value={specs.caseMaterial || ""} onChange={(e) => onChange("caseMaterial", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Loại dây</Label>
        <Input value={specs.bandType || ""} onChange={(e) => onChange("bandType", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Kháng nước</Label>
        <Input value={specs.waterResistance || ""} onChange={(e) => onChange("waterResistance", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Chip</Label>
        <Input value={specs.chip || ""} onChange={(e) => onChange("chip", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Pin</Label>
        <Input value={specs.battery || ""} onChange={(e) => onChange("battery", e.target.value)} />
      </div>
      <div className="space-y-2 col-span-2">
        <Label>Màu sắc</Label>
        <div className="flex flex-wrap gap-2">
          {specs.colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Silver"
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

export default AppleWatchSpecsForm;