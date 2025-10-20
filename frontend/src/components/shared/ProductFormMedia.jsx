/* FILE: src/components/shared/ProductFormMedia.jsx */ 

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

const ProductFormMedia = ({ formData, handleArrayChange, addArrayItem, removeArrayItem, previewImage }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Hình ảnh</Label>
        <div className="flex flex-col gap-2">
          {formData.images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={img}
                onChange={(e) => handleArrayChange("images", idx, e.target.value)}
                placeholder="URL hình ảnh"
                className={idx === 0 ? "font-bold" : ""}
              />
              <Button type="button" variant="outline" onClick={() => removeArrayItem("images", idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addArrayItem("images")}>
            <Plus className="w-4 h-4 mr-2" /> Thêm ảnh
          </Button>
        </div>
        {formData.images.some((img) => img.trim()) && (
          <div className="mt-4">
            <Label>Ảnh xem trước</Label>
            <div className="aspect-square bg-gray-200 mt-2">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFormMedia;