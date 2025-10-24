// ============================================
// FILE: src/components/shared/specs/AppleWatchSpecsForm.jsx
// ✅ SPECS FORM CHO APPLE WATCH - KHỚP MODEL
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

const AppleWatchSpecsForm = ({ specs, onChange, onColorChange, onAddColor, onRemoveColor }) => {
  const colors = specs.colors || [''];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* TAB THÔNG SỐ APPLE WATCH */}
      <div className="space-y-2">
        <Label>Kích thước màn hình</Label>
        <Input 
          value={specs.screenSize || ""} 
          onChange={(e) => onChange("screenSize", e.target.value)} 
          placeholder="VD: 42mm"
        />
      </div>
      <div className="space-y-2">
        <Label>CPU</Label>
        <Input 
          value={specs.cpu || ""} 
          onChange={(e) => onChange("cpu", e.target.value)} 
          placeholder="VD: S10 SIP"
        />
      </div>
      <div className="space-y-2">
        <Label>Hệ điều hành</Label>
        <Input 
          value={specs.os || ""} 
          onChange={(e) => onChange("os", e.target.value)} 
          placeholder="VD: watchOS 11"
        />
      </div>
      <div className="space-y-2">
        <Label>Bộ nhớ trong</Label>
        <Input 
          value={specs.storage || ""} 
          onChange={(e) => onChange("storage", e.target.value)} 
          placeholder="VD: 64GB"
        />
      </div>
      <div className="space-y-2">
        <Label>Dung lượng pin</Label>
        <Input 
          value={specs.batteryLife || ""} 
          onChange={(e) => onChange("batteryLife", e.target.value)} 
          placeholder="VD: Lên đến 18 giờ"
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
     
      
      {/* MÀU SẮC - DYNAMIC ARRAY */}
      <div className="space-y-2 col-span-full">
        <Label>Màu sắc</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={color}
                onChange={(e) => onColorChange(idx, e.target.value)}
                placeholder="VD: Jet Black"
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

      <div className="space-y-2 col-span-full">
        <Label>Tính năng</Label>
        <Textarea 
          value={specs.features || ""} 
          onChange={(e) => onChange("features", e.target.value)} 
          placeholder="VD: Cam biến điện tim, Cam biến nhiệt độ, Cam biến nhịp tim, Cam biến oxy máu, Theo dõi giấc ngủ, Theo dõi chu kỳ kinh nguyệt, Theo dõi tiếng ồn, Phát hiện ngã, Phát hiện tai nạn xe hơi, SOS khẩn cấp, Theo dõi nhịp thở khi ngủ, Theo dõi độ cao, Theo dõi nhiệt độ nước"
        />
      </div>
      <div className="space-y-2 col-span-full">
        <Label>Tính năng sức khỏe</Label>
        <Textarea 
          value={specs.healthFeatures || ""} 
          onChange={(e) => onChange("healthFeatures", e.target.value)} 
          placeholder="VD: Theo dõi nhịp tim, Đo điện tâm đồ, Đo nồng độ oxy trong máu, Theo dõi giấc ngủ, Theo dõi chu kỳ kinh nguyệt, Theo dõi tiếng ồn, Phát hiện ngã, Phát hiện tai nạn xe hơi, SOS khẩn cấp, Theo dõi nhịp thở khi ngủ"
        />
      </div>
    </div>
  );
};

export default AppleWatchSpecsForm;