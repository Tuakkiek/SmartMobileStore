// ============================================
// FILE: src/components/shared/specs/AccessoriesSpecsForm.jsx
// ✅ DYNAMIC SPECS FORM CHO PHỤ KIỆN - KHỚP MODEL
// ============================================

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const AccessoriesSpecsForm = ({ customSpecs, onChange, onAdd, onRemove }) => {
  return (
    <div className="space-y-4">
      <Label>Thông số tùy chỉnh (Tên - Giá trị)</Label>
      {customSpecs.map((spec, idx) => (
        <div key={idx} className="flex items-end gap-2 p-3 border rounded-md">
          <div className="space-y-2 flex-1">
            <Label>Tên thông số</Label>
            <Input
              value={spec.key}
              onChange={(e) => onChange(idx, "key", e.target.value)}
              placeholder="VD: Chất liệu"
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Giá trị</Label>
            <Input
              value={spec.value}
              onChange={(e) => onChange(idx, "value", e.target.value)}
              placeholder="VD: Nhôm cao cấp"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onRemove(idx)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-2" /> Thêm thông số
      </Button>
    </div>
  );
};

export default AccessoriesSpecsForm;