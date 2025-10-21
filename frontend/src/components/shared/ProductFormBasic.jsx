import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONDITION_OPTIONS } from "@/lib/productConstants";

const ProductFormBasic = ({ formData, setFormData, editing }) => {
  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên sản phẩm <span className="text-red-500">*</span></Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Model <span className="text-red-500">*</span></Label>
          <Input
            value={formData.model}
            onChange={(e) => handleChange("model", e.target.value)}
            placeholder={`VD: ${formData.category === "iPhone" ? "iPhone 17 Pro Max" : formData.category === "iPad" ? "iPad Pro 13-inch" : formData.category === "Mac" ? "MacBook Pro 14-inch M3" : formData.category === "AirPods" ? "AirPods Pro 2" : formData.category === "Apple Watch" ? "Apple Watch Series 10" : "Smart Folio"}`}
            required
          />
        </div>
        {editing && (
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Input value={formData.category} disabled />
          </div>
        )}
        <div className="space-y-2">
          <Label>Trạng thái máy</Label>
          <Select value={formData.condition} onValueChange={(value) => handleChange("condition", value)} disabled={editing}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
};

export default ProductFormBasic;