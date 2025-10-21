// ============================================
// FILE: src/components/shared/specs/MacSpecsForm.jsx
// ✅ NEW: SPECS FORM CHO MAC
// ============================================

import React from "react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Trash2, Plus } from "lucide-react";

const MacSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Chip</Label>
        <Input value={specs.chip || ""} onChange={(e) => onChange("chip", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Loại card đồ họa</Label>
        <Input value={specs.gpu || ""} onChange={(e) => onChange("gpu", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Dung lượng RAM</Label>
        <Input value={specs.ram || ""} onChange={(e) => onChange("ram", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Ổ cứng</Label>
        <Input value={specs.storage || ""} onChange={(e) => onChange("storage", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Kích thước màn hình</Label>
        <Input value={specs.screenSize || ""} onChange={(e) => onChange("screenSize", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Công nghệ màn hình</Label>
        <Input value={specs.screen || ""} onChange={(e) => onChange("screen", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Pin</Label>
        <Input value={specs.battery || ""} onChange={(e) => onChange("battery", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Hệ điều hành</Label>
        <Input value={specs.os || ""} onChange={(e) => onChange("os", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Độ phân giải màn hình</Label>
        <Input value={specs.resolution || ""} onChange={(e) => onChange("resolution", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Loại CPU</Label>
        <Input value={specs.cpuType || ""} onChange={(e) => onChange("cpuType", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Cổng kết nối</Label>
        <Input value={specs.ports || ""} onChange={(e) => onChange("ports", e.target.value)} />
      </div>
      <div className="space-y-2 col-span-2">
        <Label>Màu sắc</Label>
        <div className="flex flex-wrap gap-2">
          {specs.colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Space Gray"
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

export default MacSpecsForm;