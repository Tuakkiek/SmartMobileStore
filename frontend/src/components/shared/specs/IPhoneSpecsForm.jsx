// ============================================
// FILE: src/components/shared/specs/IPhoneSpecsForm.jsx
// ✅ NEW: SPECS FORM CHO IPHONE/IPAD
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const IPhoneSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Kích thước màn hình</Label>
        <Input value={specs.screenSize || ""} onChange={(e) => onChange("screenSize", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>CPU</Label>
        <Input value={specs.cpu || ""} onChange={(e) => onChange("cpu", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Hệ điều hành</Label>
        <Input value={specs.operatingSystem || ""} onChange={(e) => onChange("operatingSystem", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Bộ nhớ trong</Label>
        <Input value={specs.storage || ""} onChange={(e) => onChange("storage", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>RAM</Label>
        <Input value={specs.ram || ""} onChange={(e) => onChange("ram", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Camera chính</Label>
        <Input value={specs.mainCamera || ""} onChange={(e) => onChange("mainCamera", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Camera selfie</Label>
        <Input value={specs.frontCamera || ""} onChange={(e) => onChange("frontCamera", e.target.value)} />
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
                placeholder="VD: Black"
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

export default IPhoneSpecsForm;