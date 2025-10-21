// frontend/src/components/shared/ProductFormVariants.jsx
import React from "react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Image } from "lucide-react";

const ProductFormVariants = ({ 
  formData, 
  handleVariantChange, 
  handleVariantImageChange,
  addVariantImage,
  removeVariantImage,
  handleVariantOptionChange, 
  addVariant, 
  removeVariant, 
  addVariantOption, 
  removeVariantOption 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Biến thể sản phẩm (Màu & Cấu hình)</Label>
        <Button type="button" variant="outline" onClick={addVariant}>
          <Plus className="w-4 h-4 mr-2" /> Thêm màu
        </Button>
      </div>

      {formData.variants.map((variant, vIdx) => (
        <div key={vIdx} className="rounded-lg p-4 space-y-4 border-2">
          {/* HEADER: Màu sắc */}
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex-1 max-w-xs">
              <Label>Màu sắc <span className="text-red-500">*</span></Label>
              <Input
                placeholder="VD: Space Gray"
                value={variant.color}
                onChange={(e) => handleVariantChange(vIdx, "color", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <Button 
              type="button" 
              variant="destructive" 
              size="sm"
              onClick={() => removeVariant(vIdx)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Xóa màu
            </Button>
          </div>

          {/* BỘ ẢNH */}
          <div className="space-y-2 bg-blue-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-blue-600" />
              <Label className="text-blue-900">Bộ ảnh cho màu {variant.color || 'này'}</Label>
            </div>
            
            <div className="space-y-2">
              {variant.images.map((imageUrl, imgIdx) => (
                <div key={imgIdx} className="flex items-center gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => handleVariantImageChange(vIdx, imgIdx, e.target.value)}
                    placeholder={`URL ảnh ${imgIdx + 1}`}
                    className="flex-1"
                  />
                  {variant.images.length > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeVariantImage(vIdx, imgIdx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => addVariantImage(vIdx)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" /> Thêm ảnh cho màu này
              </Button>
            </div>

            {/* Preview */}
            {variant.images[0] && (
              <div className="mt-2">
                <img 
                  src={variant.images[0]} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded border"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {/* CẤU HÌNH */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Phiên bản cấu hình:</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => addVariantOption(vIdx)}
              >
                <Plus className="w-4 h-4 mr-2" /> Thêm phiên bản
              </Button>
            </div>

            {variant.options.map((opt, oIdx) => (
              <div key={oIdx} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end p-3 bg-gray-50 rounded-md">
                <div className="space-y-1">
                  <Label className="text-xs">CPU – GPU</Label>
                  <Input
                    placeholder="M3 Pro"
                    value={opt.cpuGpu}
                    onChange={(e) => handleVariantOptionChange(vIdx, oIdx, "cpuGpu", e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">RAM</Label>
                  <Select 
                    value={opt.ram || ""} 
                    onValueChange={(value) => handleVariantOptionChange(vIdx, oIdx, "ram", value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {["3GB", "4GB", "6GB", "8GB", "12GB", "16GB", "18GB", "24GB", "32GB", "64GB"].map((ram) => (
                        <SelectItem key={ram} value={ram}>{ram}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Bộ nhớ</Label>
                  <Select 
                    value={opt.storage || ""} 
                    onValueChange={(value) => handleVariantOptionChange(vIdx, oIdx, "storage", value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {["64GB", "128GB", "256GB", "512GB", "1TB", "2TB", "4TB"].map((storage) => (
                        <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Giá gốc</Label>
                  <Input
                    type="number"
                    value={opt.originalPrice}
                    onChange={(e) => handleVariantOptionChange(vIdx, oIdx, "originalPrice", e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Giá bán</Label>
                  <Input
                    type="number"
                    value={opt.price}
                    onChange={(e) => handleVariantOptionChange(vIdx, oIdx, "price", e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Số lượng</Label>
                  <Input
                    type="number"
                    value={opt.quantity}
                    onChange={(e) => handleVariantOptionChange(vIdx, oIdx, "quantity", e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => removeVariantOption(vIdx, oIdx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductFormVariants;