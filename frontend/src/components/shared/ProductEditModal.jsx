// frontend/src/components/shared/ProductEditModal.jsx

import React, { useState, useEffect, useCallback } from "react";
// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Spec Forms
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import IPadSpecsForm from "@/components/shared/specs/IPadSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";
// Variant Forms
import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import IPadVariantsForm from "@/components/shared/variants/IPadVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";
// Constants & Hooks
import { INSTALLMENT_BADGE_OPTIONS } from "@/lib/productConstants";
import { useProductForm } from "@/hooks/products/useProductForm";
import { useVariantForm } from "@/hooks/products/useVariantForm";
import { useProductValidation } from "@/hooks/products/useProductValidation";
import { useProductAPI } from "@/hooks/products/useProductAPI";

const ProductEditModal = ({
  open,
  onOpenChange,
  mode = "edit",
  category,
  product,
  onSave = () => {},
}) => {
  const isEdit = mode === "edit";
  const effectiveCategory = isEdit ? product?.category : category;

  const [activeFormTab, setActiveFormTab] = useState("basic");

  // 1. Hook quản lý State và Basic Handlers
  const {
    formData,
    setFormData,
    handleBasicChange,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
    handleCustomSpecChange,
    addCustomSpec,
    removeCustomSpec,
  } = useProductForm(open, isEdit, effectiveCategory, product);

  // 2. Hook quản lý Variant Handlers
  const {
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
  } = useVariantForm(formData, setFormData, effectiveCategory);

  // 3. Hook quản lý Validation
  const { validateForm } = useProductValidation(
    formData,
    effectiveCategory,
    setActiveFormTab
  );

  // 4. Hook quản lý API Submit
  const { handleSubmit: submitAPI, isSubmitting } = useProductAPI(
    effectiveCategory,
    isEdit,
    product,
    validateForm,
    onOpenChange,
    onSave
  );

  // Gắn formData vào handleSubmit để nó có thể được gọi trong form
  const handleSubmit = useCallback(
    (e) => submitAPI(e, formData),
    [submitAPI, formData]
  );

  // Logic render Form Thông số
  const renderSpecsForm = useCallback(() => {
    if (!formData) return null;

    const props = {
      specs: formData.specifications || {},
      onChange: handleSpecChange,
      onColorChange: handleColorChange,
      onAddColor: addColor,
      onRemoveColor: removeColor,
    };

    const customProps = {
      customSpecs: Array.isArray(formData.specifications)
        ? formData.specifications
        : [],
      onChange: handleCustomSpecChange,
      onAdd: addCustomSpec,
      onRemove: removeCustomSpec,
    };

    switch (effectiveCategory) {
      case "iPhone":
        return <IPhoneSpecsForm {...props} />;
      case "iPad":
        return <IPadSpecsForm {...props} />;
      case "Mac":
        return <MacSpecsForm {...props} />;
      case "AirPods":
        return <AirPodsSpecsForm {...props} />;
      case "AppleWatch":
        return <AppleWatchSpecsForm {...props} />;
      case "Accessories":
        return <AccessoriesSpecsForm {...customProps} />;
      default:
        return null;
    }
  }, [
    formData,
    effectiveCategory,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
    handleCustomSpecChange,
    addCustomSpec,
    removeCustomSpec,
  ]);

  // Logic render Form Biến thể
  const renderVariantsForm = useCallback(() => {
    if (!formData) return null;

    const props = {
      variants: formData.variants || [],
      onAddVariant: addVariant,
      onRemoveVariant: removeVariant,
      onVariantChange: handleVariantChange,
      onImageChange: handleVariantImageChange,
      onAddImage: addVariantImage,
      onRemoveImage: removeVariantImage,
      onOptionChange: handleVariantOptionChange,
      onAddOption: addVariantOption,
      onRemoveOption: removeVariantOption,
      model: formData.model,
    };

    switch (effectiveCategory) {
      case "iPhone":
        return <IPhoneVariantsForm {...props} />;
      case "iPad":
        return <IPadVariantsForm {...props} />;
      case "Mac":
        return <MacVariantsForm {...props} />;
      case "AirPods":
        return <AirPodsVariantsForm {...props} />;
      case "AppleWatch":
        return <AppleWatchVariantsForm {...props} />;
      case "Accessories":
        return <AccessoriesVariantsForm {...props} />;
      default:
        return null;
    }
  }, [
    formData,
    effectiveCategory,
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
  ]);

  // RENDER LOADING STATE
  if (!formData || !effectiveCategory) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[90vw] max-w-none max-h-[95vh] overflow-y-auto p-0"
          style={{ width: "50vw" }}
        >
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-bold">
              Đang tải...
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // RENDER MAIN MODAL
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-none max-h-[95vh] overflow-y-auto p-0"
        style={{ width: "50vw", maxWidth: "none" }}
      >
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {`${
              isEdit ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"
            } - ${effectiveCategory}`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {`${
              isEdit ? "Chỉnh sửa thông tin sản phẩm" : "Tạo sản phẩm mới"
            } trong danh mục ${effectiveCategory}`}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                <TabsTrigger value="specs">Thông số</TabsTrigger>
                <TabsTrigger value="variants">Biến thể</TabsTrigger>
              </TabsList>

              {/* TAB CƠ BẢN */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ... (Các trường Basic Form giữ nguyên) */}
                  <div className="space-y-2">
                    <Label>
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) =>
                        handleBasicChange("name", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Model <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.model || ""}
                      onChange={(e) =>
                        handleBasicChange("model", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tình trạng</Label>
                    <Select
                      value={formData.condition || "NEW"}
                      onValueChange={(value) =>
                        handleBasicChange("condition", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">Mới 100%</SelectItem>
                        <SelectItem value="LIKE_NEW">Like new</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select
                      value={formData.status || "AVAILABLE"}
                      onValueChange={(value) =>
                        handleBasicChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                        <SelectItem value="DISCONTINUED">
                          Ngừng kinh doanh
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Trả góp 0%</Label>
                    <Select
                      value={formData.installmentBadge || "NONE"}
                      onValueChange={(value) =>
                        handleBasicChange("installmentBadge", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chương trình trả góp" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLMENT_BADGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Badge này chỉ hiển thị khi sản phẩm không thuộc top "Mới"
                      hoặc "Bán chạy"
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      handleBasicChange("description", e.target.value)
                    }
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Nhập mô tả sản phẩm..."
                  />
                </div>
              </TabsContent>

              {/* TAB THÔNG SỐ */}
              <TabsContent value="specs" className="mt-4">
                {renderSpecsForm()}
              </TabsContent>

              {/* TAB BIẾN THỂ */}
              <TabsContent value="variants" className="mt-4">
                {renderVariantsForm()}
              </TabsContent>
            </Tabs>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditModal;
