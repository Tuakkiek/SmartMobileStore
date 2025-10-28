// frontend/src/components/shared/ProductEditModal.jsx
import React, { useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import IPadSpecsForm from "@/components/shared/specs/IPadSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";

import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import IPadVariantsForm from "@/components/shared/variants/IPadVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";

import {
  INSTALLMENT_BADGE_OPTIONS,
  getEmptyFormData,
  emptyVariant,
} from "@/lib/productConstants";
import { generateSKU } from "@/lib/generateSKU";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

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

  const [formData, setFormData] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!effectiveCategory) return;

    if (isEdit && product) {
      let specs = { ...product.specifications };
      if (!specs.colors || !Array.isArray(specs.colors)) {
        specs.colors = [];
      }

      const colorGroups = {};
      product.variants.forEach((variant) => {
        const colorKey = variant.color?.trim().toLowerCase() || "unknown";
        if (!colorGroups[colorKey]) {
          colorGroups[colorKey] = {
            color: variant.color || "",
            images: Array.isArray(variant.images)
              ? variant.images.map((img) => String(img || ""))
              : [""],
            options: [],
          };
        }

        const option = {
          sku: String(variant.sku || ""),
          originalPrice: String(variant.originalPrice || ""),
          price: String(variant.price || ""),
          stock: String(variant.stock || ""),
          storage: String(variant.storage || ""),
          connectivity: String(variant.connectivity || ""),
          cpuGpu: String(variant.cpuGpu || ""),
          ram: String(variant.ram || ""),
          variantName: String(variant.variantName || ""),
          bandSize: String(variant.bandSize || ""),
        };
        colorGroups[colorKey].options.push(option);
      });

      const populatedVariants =
        Object.values(colorGroups).length > 0
          ? Object.values(colorGroups)
          : [emptyVariant(effectiveCategory)];

      setFormData({
        name: String(product.name || ""),
        model: String(product.model || ""),
        condition: product.condition || "NEW",
        description: product.description || "",
        status: product.status || "AVAILABLE",
        installmentBadge: product.installmentBadge || "NONE",
        specifications: specs,
        variants: populatedVariants,
      });
    } else {
      setFormData({
        ...getEmptyFormData(effectiveCategory),
        installmentBadge: "NONE",
      });
    }
  }, [open, isEdit, effectiveCategory, product]);

  // FORM HANDLERS - TAB CƠ BẢN
  const handleBasicChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // FORM HANDLERS - TAB THÔNG SỐ
  const handleSpecChange = useCallback(
    (key, value) => {
      if (effectiveCategory === "Accessories") return;
      setFormData((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, [key]: value },
      }));
    },
    [effectiveCategory]
  );

  const handleColorChange = useCallback(
    (idx, value) => {
      const colors = [...(formData.specifications.colors || [""])];
      colors[idx] = value;
      setFormData((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, colors },
      }));
    },
    [formData]
  );

  const addColor = useCallback(() => {
    const colors = [...(formData.specifications.colors || [""]), ""];
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  }, [formData]);

  const removeColor = useCallback(
    (idx) => {
      const colors = (formData.specifications.colors || [""]).filter(
        (_, i) => i !== idx
      );
      setFormData((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, colors },
      }));
    },
    [formData]
  );

  // For Accessories only
  const handleCustomSpecChange = useCallback(
    (idx, field, value) => {
      const specs = [...(formData.specifications || [])];
      specs[idx] = { ...specs[idx], [field]: value };
      setFormData((prev) => ({ ...prev, specifications: specs }));
    },
    [formData]
  );

  const addCustomSpec = useCallback(() => {
    const specs = [...(formData.specifications || []), { key: "", value: "" }];
    setFormData((prev) => ({ ...prev, specifications: specs }));
  }, [formData]);

  const removeCustomSpec = useCallback(
    (idx) => {
      const specs = (formData.specifications || []).filter((_, i) => i !== idx);
      setFormData((prev) => ({ ...prev, specifications: specs }));
    },
    [formData]
  );

  // FORM HANDLERS - TAB BIẾN THỂ
  const addVariant = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, emptyVariant(effectiveCategory)],
    }));
  }, [effectiveCategory]);

  const removeVariant = useCallback((vIdx) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== vIdx),
    }));
  }, []);

  const handleVariantChange = useCallback(
    (vIdx, field, value) => {
      const variants = [...formData.variants];
      variants[vIdx] = { ...variants[vIdx], [field]: value };
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const handleVariantImageChange = useCallback(
    (vIdx, imgIdx, value) => {
      const variants = [...formData.variants];
      variants[vIdx].images[imgIdx] = value;
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const addVariantImage = useCallback(
    (vIdx) => {
      const variants = [...formData.variants];
      variants[vIdx].images.push("");
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const removeVariantImage = useCallback(
    (vIdx, imgIdx) => {
      const variants = [...formData.variants];
      variants[vIdx].images = variants[vIdx].images.filter(
        (_, i) => i !== imgIdx
      );
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const addVariantOption = useCallback(
    (vIdx) => {
      const variants = [...formData.variants];
      variants[vIdx].options.push({
        sku: "",
        originalPrice: "",
        price: "",
        stock: "",
        storage: "",
        connectivity: "",
        cpuGpu: "",
        ram: "",
        variantName: "",
        bandSize: "",
      });
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const removeVariantOption = useCallback(
    (vIdx, oIdx) => {
      const variants = [...formData.variants];
      variants[vIdx].options = variants[vIdx].options.filter(
        (_, i) => i !== oIdx
      );
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const handleVariantOptionChange = useCallback(
    (vIdx, oIdx, field, value) => {
      const variants = [...formData.variants];
      variants[vIdx].options[oIdx] = {
        ...variants[vIdx].options[oIdx],
        [field]: value,
      };
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData]
  );

  const validateForm = useCallback(() => {
    if (!formData.name?.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      setActiveFormTab("basic");
      return false;
    }
    if (!formData.model?.trim()) {
      toast.error("Vui lòng nhập model sản phẩm");
      setActiveFormTab("basic");
      return false;
    }
    if (!formData.variants?.length) {
      toast.error("Vui lòng thêm ít nhất một biến thể");
      setActiveFormTab("variants");
      return false;
    }

    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i];
      if (!variant.color?.trim()) {
        toast.error(`Vui lòng nhập màu sắc cho biến thể ${i + 1}`);
        setActiveFormTab("variants");
        return false;
      }
      if (!variant.images?.length || !variant.images[0]?.trim()) {
        toast.error(`Vui lòng thêm ít nhất một ảnh cho biến thể ${i + 1}`);
        setActiveFormTab("variants");
        return false;
      }
      if (!variant.options?.length) {
        toast.error(
          `Vui lòng thêm ít nhất một phiên bản cho biến thể ${i + 1}`
        );
        setActiveFormTab("variants");
        return false;
      }

      for (let j = 0; j < variant.options.length; j++) {
        const option = variant.options[j];
        if (
          ["iPhone", "iPad", "Mac"].includes(effectiveCategory) &&
          !option.storage?.trim()
        ) {
          toast.error(
            `Vui lòng chọn bộ nhớ cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (effectiveCategory === "iPad" && !option.connectivity?.trim()) {
          toast.error(
            `Vui lòng chọn kết nối cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          effectiveCategory === "Mac" &&
          (!option.cpuGpu?.trim() || !option.ram?.trim())
        ) {
          toast.error(
            `Vui lòng nhập CPU-GPU và RAM cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          ["AirPods", "AppleWatch", "Accessories"].includes(
            effectiveCategory
          ) &&
          !option.variantName?.trim()
        ) {
          toast.error(
            `Vui lòng nhập tên biến thể cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (!option.sku?.trim()) {
          toast.error(
            `Vui lòng nhập SKU cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.price?.trim() ||
          isNaN(Number(option.price)) ||
          Number(option.price) < 0
        ) {
          toast.error(
            `Vui lòng nhập giá bán hợp lệ cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.originalPrice?.trim() ||
          isNaN(Number(option.originalPrice)) ||
          Number(option.originalPrice) < 0
        ) {
          toast.error(
            `Vui lòng nhập giá gốc hợp lệ cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.stock?.trim() ||
          isNaN(Number(option.stock)) ||
          Number(option.stock) < 0
        ) {
          toast.error(
            `Vui lòng nhập số lượng tồn kho hợp lệ cho phiên bản ${
              j + 1
            } của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
      }
    }

    // VALIDATE: price <= originalPrice
    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i];
      for (let j = 0; j < variant.options.length; j++) {
        const option = variant.options[j];
        const price = Number(option.price);
        const originalPrice = Number(option.originalPrice);
        if (price > originalPrice && originalPrice > 0) {
          toast.error(
            `Giá bán (${price.toLocaleString()}đ) không được lớn hơn giá gốc (${originalPrice.toLocaleString()}đ) ` +
              `tại phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
      }
    }

    return true;
  }, [formData, effectiveCategory]);

  const cleanPayload = useCallback(
    (data) => {
      const cleaned = { ...data };
      const authStorage = localStorage.getItem("auth-storage");
      let createdBy = null;
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          createdBy = state?.user?._id || state?.user?.id;
        } catch (e) {
          console.warn("Lỗi parse auth-storage:", e);
        }
      }

      cleaned.variants = (data.variants || [])
        .map((variant) => ({
          color: String(variant.color || "").trim(),
          images: (variant.images || []).filter((img) => img.trim()),
          options: (variant.options || [])
            .map((opt) => {
              const o = {
                originalPrice: Number(opt.originalPrice || 0),
                price: Number(opt.price || 0),
                stock: Number(opt.stock || 0),
              };
              let variantOpts;
              if (effectiveCategory === "iPhone") {
                o.storage = opt.storage;
                variantOpts = o.storage;
              }
              if (effectiveCategory === "iPad") {
                o.storage = opt.storage;
                o.connectivity = opt.connectivity;
                variantOpts = o.storage;
              }
              if (effectiveCategory === "Mac") {
                o.cpuGpu = opt.cpuGpu;
                o.ram = opt.ram;
                o.storage = opt.storage;
                variantOpts = {
                  cpuGpu: o.cpuGpu,
                  ram: o.ram,
                  storage: o.storage,
                };
              }
              if (
                ["AirPods", "Accessories", "AppleWatch"].includes(
                  effectiveCategory
                )
              ) {
                o.variantName = opt.variantName;
                variantOpts = o.variantName;
              }
              if (effectiveCategory === "AppleWatch") o.bandSize = opt.bandSize;
              o.sku =
                opt.sku ||
                generateSKU(
                  effectiveCategory,
                  cleaned.model,
                  variant.color,
                  variantOpts,
                  opt.connectivity || ""
                );
              return o;
            })
            .filter((o) => o.price >= 0 && o.stock >= 0),
        }))
        .filter((v) => v.color && v.options.length > 0);

      cleaned.createdBy = createdBy;
      cleaned.category = effectiveCategory;
      cleaned.name = cleaned.name.trim();
      cleaned.model = cleaned.model.trim();
      cleaned.description = cleaned.description.trim();
      cleaned.specifications = {
        ...cleaned.specifications,
        colors: Array.isArray(cleaned.specifications.colors)
          ? cleaned.specifications.colors
              .map((c) => String(c).trim())
              .filter(Boolean)
          : [],
      };

      return cleaned;
    },
    [effectiveCategory]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const api = API_MAP[effectiveCategory];
      const payload = cleanPayload(formData);
      let newId = null;
      if (isEdit) {
        await api.update(product._id, payload);
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        const res = await api.create(payload);
        newId = res.data?._id || res.data?.data?._id;
        toast.success("Tạo sản phẩm thành công!");
      }
      onOpenChange(false);
      onSave();
      if (newId) onSave(newId); // For create
    } catch (error) {
      toast.error(error.response?.data?.message || "Lưu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSpecsForm = useCallback(() => {
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
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
    handleCustomSpecChange,
    addCustomSpec,
    removeCustomSpec,
    effectiveCategory,
  ]);

  const renderVariantsForm = useCallback(() => {
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
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
    effectiveCategory,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-none max-h-[95vh] overflow-y-auto p-0"
        style={{ width: "50vw", maxWidth: "none" }}
      >
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {!formData || !effectiveCategory
              ? "Đang tải..."
              : `${
                  isEdit ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"
                } - ${effectiveCategory}`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {!formData || !effectiveCategory
              ? "Đang tải dữ liệu..."
              : `${
                  isEdit ? "Chỉnh sửa thông tin sản phẩm" : "Tạo sản phẩm mới"
                } trong danh mục ${effectiveCategory}`}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {!formData || !effectiveCategory ? (
            <div className="text-center text-muted-foreground">
              Đang tải dữ liệu...
            </div>
          ) : (
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
                        Badge này chỉ hiển thị khi sản phẩm không thuộc top
                        "Mới" hoặc "Bán chạy"
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
                  {isSubmitting
                    ? "Đang lưu..."
                    : isEdit
                    ? "Cập nhật"
                    : "Tạo mới"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditModal;
