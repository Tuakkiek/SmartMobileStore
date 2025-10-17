import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CONDITION_OPTIONS } from "@/lib/productConstants";

const ProductCategoryModal = ({ showCategoryModal, setShowCategoryModal, selectedCategory, setSelectedCategory, selectedCondition, setSelectedCondition, handleCategorySubmit }) => {
  return (
    <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn danh mục sản phẩm cần thêm</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trạng thái máy</Label>
            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
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
          <Button onClick={handleCategorySubmit} className="w-full">
            Tiếp tục
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductCategoryModal;