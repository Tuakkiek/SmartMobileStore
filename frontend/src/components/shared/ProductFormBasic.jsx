// ============================================
// FILE: src/components/shared/ProductFormBasic.jsx
// ✅ GIỮ NGUYÊN - BASIC FORM CHO TẤT CẢ
// ============================================

import React from "react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea.jsx";
import { CONDITION_OPTIONS } from "@/lib/productConstants";

const ProductFormBasic = ({ formData, handleChange, editingProduct }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên sản phẩm</Label>
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
            placeholder="VD: iPhone 16 Pro Max"
            required
          />
        </div>
        {editingProduct ? (
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Input value={formData.category} disabled />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Trạng thái máy</Label>
          <Input value={CONDITION_OPTIONS.find(c => c.value === formData.condition)?.label} disabled />
        </div>
        <div className="space-y-2">
          <Label>Giá gốc</Label>
          <Input
            type="number"
            value={formData.originalPrice}
            onChange={(e) => handleChange("originalPrice", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Giá bán</Label>
          <Input
            type="number"
            value={formData.price}
            onChange={(e) => handleChange("price", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Giảm giá tự tính (%)</Label>
          <Input type="number" min="0" max="100" value={formData.discount} disabled />
        </div>
        <div className="space-y-2">
          <Label>Số lượng</Label>
          <Input
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Trạng thái</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
              <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
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