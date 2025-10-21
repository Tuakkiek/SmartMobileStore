// ============================================
// FILE: src/components/shared/specs/AppleWatchSpecsForm.jsx
// ✅ SPECS FORM CHO APPLE WATCH - KHỚP MODEL
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const AppleWatchSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* TAB THÔNG SỐ APPLE WATCH */}
      <div className="space-y-2">
        <Label>Thời gian dùng</Label>
        <Input 
          value={specs.batteryLife || ""} 
          onChange={(e) => onChange("batteryLife", e.target.value)} 
          placeholder="VD: 18 giờ"
        />
      </div>
      <div className="space-y-2">
        <Label>Tương thích</Label>
        <Input 
          value={specs.compatibility || ""} 
          onChange={(e) => onChange("compatibility", e.target.value)} 
          placeholder="VD: iPhone Xs trở lên"
        />
      </div>
      <div className="space-y-2">
        <Label>Hãng sản xuất</Label>
        <Input 
          value={specs.brand || ""} 
          onChange={(e) => onChange("brand", e.target.value)} 
          placeholder="VD: Apple"
        />
      </div>
      <div className="space-y-2">
        <Label>Công nghệ màn hình</Label>
        <Input 
          value={specs.screenTech || ""} 
          onChange={(e) => onChange("screenTech", e.target.value)} 
          placeholder="VD: Always-On Retina LTPO OLED"
        />
      </div>
      <div className="space-y-2">
        <Label>Nghe gọi</Label>
        <Input 
          value={specs.calling || ""} 
          onChange={(e) => onChange("calling", e.target.value)} 
          placeholder="VD: Có (LTE)"
        />
      </div>
      <div className="space-y-2">
        <Label>Tiện ích sức khỏe</Label>
        <Input 
          value={specs.healthFeatures || ""} 
          onChange={(e) => onChange("healthFeatures", e.target.value)} 
          placeholder="VD: ECG, SpO2, Nhịp tim"
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
                placeholder="VD: Midnight"
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

export default AppleWatchSpecsForm;