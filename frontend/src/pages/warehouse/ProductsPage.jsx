// ============================================
// FILE: src/pages/ProductsPage.jsx
// ✅ UPDATED: Sử dụng forms riêng cho từng category
// ============================================

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ProductCard } from "@/components/shared/ProductCard";
import { Plus, X } from "lucide-react";
import { productAPI } from "@/lib/api";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
import { toast } from "sonner";
import { CATEGORIES, getEmptyFormData, emptyVariant } from "@/lib/productConstants";
import ProductFormBasic from "@/components/shared/ProductFormBasic";
// ✅ NEW: Category-specific specs forms
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";
// ✅ NEW: Category-specific variants forms
import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";
import ProductFormMedia from "@/components/shared/ProductFormMedia";
import ProductCategoryModal from "@/components/shared/ProductCategoryModal";

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("iPhone");
  const [selectedCondition, setSelectedCondition] = useState("NEW");
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, categoryFilter, statusFilter, currentPage]);

const fetchProducts = async () => {
  setIsLoading(true);
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchTerm,
      category: filters.category || undefined,
      status: filters.status || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      sort: filters.sort,
      inStock: filters.inStock,
    };
    const response = await productAPI.getAll(params); // Dòng 80 có thể liên quan đến đây
    const data = response.data.data;
    setProducts(data.products.map(product => ({
      ...product,
      price: product.displayPrice || product.price,
      originalPrice: product.originalPrice,
      hasVariants: product.variantsCount > 0
    })));
    setPagination({
      ...pagination,
      totalPages: data.totalPages,
      total: data.total,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
  } finally {
    setIsLoading(false);
  }
};

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setSelectedCategory(product.category);
      setFormData({
        name: product.name,
        model: product.model || "",
        category: product.category,
        condition: product.condition || "NEW",
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount || 0,
        quantity: product.quantity,
        status: product.status,
        description: product.description || "",
        specifications: {
          ...product.specifications,
          colors: Array.isArray(product.specifications.colors) ? product.specifications.colors : [""],
          customSpecs: Array.isArray(product.specifications.customSpecs) ? product.specifications.customSpecs : [{ key: "", value: "" }],
        },
        variants: product.variants?.map((v) => ({
          color: v.name || v.options[0]?.color || "",
          imageUrl: v.options[0]?.imageUrl || "",
          options: v.options.map((o) => ({
            cpuGpu: o.cpuGpu || o.name || "",
            ram: o.ram || "",
            storage: o.storage || o.capacity || "",
            price: o.price || "",
            originalPrice: o.originalPrice || "",
            quantity: o.quantity || "",
          })),
        })) || [],
        images: product.images?.length > 0 ? product.images : [""],
        badges: product.badges || [],
      });
      setPreviewImage(product.images?.[0] || null);
      setShowForm(true);
      setShowCategoryModal(false);
    } else {
      setEditingProduct(null);
      setSelectedCategory("iPhone");
      setSelectedCondition("NEW");
      setShowCategoryModal(true);
    }
    setError("");
    setActiveTab("basic");
  };

  const handleCategorySubmit = () => {
    const newFormData = getEmptyFormData(selectedCategory);
    newFormData.condition = selectedCondition;
    setFormData(newFormData);
    setShowForm(true);
    setShowCategoryModal(false);
  };

  const handleChange = (name, value) => {
    setError("");
    const updatedFormData = { ...formData, [name]: value };
    if (name === "originalPrice" || name === "price") {
      const origPrice = Number(updatedFormData.originalPrice) || 0;
      const sellPrice = Number(updatedFormData.price) || 0;
      updatedFormData.discount = origPrice > 0 ? Math.round(((origPrice - sellPrice) / origPrice) * 100) : 0;
    }
    setFormData(updatedFormData);
  };

  const handleSpecChange = (key, value) => {
    setFormData({
      ...formData,
      specifications: { 
        ...formData.specifications, 
        [key]: value 
      },
    });
  };

  const handleCustomSpecChange = (index, field, value) => {
    const customSpecs = [...formData.specifications.customSpecs];
    customSpecs[index][field] = value;
    setFormData({
      ...formData,
      specifications: { ...formData.specifications, customSpecs },
    });
  };

  const addCustomSpec = () => {
    setFormData({
      ...formData,
      specifications: {
        ...formData.specifications,
        customSpecs: [...formData.specifications.customSpecs, { key: "", value: "" }],
      },
    });
  };

  const removeCustomSpec = (index) => {
    const customSpecs = formData.specifications.customSpecs.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      specifications: { ...formData.specifications, customSpecs },
    });
  };

  const handleColorChange = (index, value) => {
    const colors = [...formData.specifications.colors];
    colors[index] = value;
    setFormData({
      ...formData,
      specifications: { ...formData.specifications, colors },
    });
  };

  const addColor = () => {
    setFormData({
      ...formData,
      specifications: {
        ...formData.specifications,
        colors: [...formData.specifications.colors, ""],
      },
    });
  };

  const removeColor = (index) => {
    if (formData.specifications.colors.length <= 1) {
      toast.error("Phải có ít nhất 1 màu sắc");
      return;
    }
    const colors = formData.specifications.colors.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      specifications: { ...formData.specifications, colors },
    });
  };

  const handleVariantChange = (variantIndex, field, value) => {
    const variants = [...formData.variants];
    variants[variantIndex][field] = value;
    let newFormData = { ...formData, variants };
    if (field === "imageUrl" && value.trim()) {
      setPreviewImage(value);
      if (!formData.images.some((img) => img === value)) {
        let images = [...formData.images];
        if (images[0] === "") images[0] = value;
        else images.push(value);
        newFormData = { ...newFormData, images };
      }
    }
    setFormData(newFormData);
  };

  const handleVariantOptionChange = (variantIndex, optionIndex, field, value) => {
    const variants = [...formData.variants];
    const options = [...variants[variantIndex].options];
    options[optionIndex][field] = value;
    variants[variantIndex].options = options;
    setFormData({ ...formData, variants });
  };

  const addVariant = () => setFormData({ ...formData, variants: [...formData.variants, emptyVariant()] });
  const removeVariant = (variantIndex) => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== variantIndex) });
  const addVariantOption = (variantIndex) => {
    const variants = [...formData.variants];
    const options = [...variants[variantIndex].options];
    options.push({ cpuGpu: "", ram: "", storage: "", price: "", originalPrice: "", quantity: "" });
    variants[variantIndex].options = options;
    setFormData({ ...formData, variants });
  };
  const removeVariantOption = (variantIndex, optionIndex) => {
    const variants = [...formData.variants];
    const options = variants[variantIndex].options.filter((_, i) => i !== oIndex);
    variants[variantIndex].options = options;
    setFormData({ ...formData, variants });
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    if (field === "images" && index === 0 && value) setPreviewImage(value);
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field) => setFormData({ ...formData, [field]: [...formData[field], ""] });
  const removeArrayItem = (field, index) => {
    if (formData[field].length <= 1) {
      toast.error("Phải có ít nhất 1 mục");
      return;
    }
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
    if (field === "images" && index === 0) setPreviewImage(newArray[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!formData.model.trim()) {
      setError("Model là trường bắt buộc");
      toast.error("Vui lòng nhập model sản phẩm");
      setIsSubmitting(false);
      return;
    }

    try {
      const submitData = {
        name: formData.name,
        model: formData.model,
        category: formData.category,
        condition: formData.condition,
        price: Number(formData.price || 0),
        originalPrice: Number(formData.originalPrice || 0),
        discount: Number(formData.discount || 0),
        quantity: Number(formData.quantity || 0),
        status: formData.status,
        description: formData.description,
        specifications: {
          ...formData.specifications,
          colors: formData.specifications.colors.filter((c) => c.trim() !== ""),
          customSpecs: formData.category === "Phụ kiện" 
            ? formData.specifications.customSpecs.filter(s => s.key.trim() && s.value.trim())
            : undefined,
        },
        variants: formData.variants.map((v) => ({
          type: "Color",
          name: v.color,
          options: v.options.map((o) => ({
            name: `${o.cpuGpu} - ${o.ram} - ${o.storage}`,
            color: v.color,
            cpuGpu: o.cpuGpu,
            ram: o.ram,
            storage: o.storage,
            price: Number(o.price || 0),
            originalPrice: Number(o.originalPrice || 0),
            imageUrl: v.imageUrl || null,
            quantity: Number(o.quantity || 0),
          })),
        })),
        images: formData.images.filter((img) => img.trim() !== ""),
        badges: formData.badges,
      };

      if (editingProduct) {
        await productAPI.update(editingProduct._id, submitData);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await productAPI.create(subData);
        toast.success("Tạo sản phẩm thành công");
      }
      await fetchProducts();
      setShowForm(false);
    } catch (error) {
      console.error("Submit error:", error);
      setError(error.response?.data?.message || `${editingProduct ? "Cập nhật" : "Tạo"} sản phẩm thất bại`);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await productAPI.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleProductUpdate = async (productId, data) => {
    try {
      await productAPI.update(productId, data);
      await fetchProducts();
      toast.success("Cập nhật sản phẩm thành công");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật sản phẩm thất bại");
    }
  };

  if (isLoading && products.length === 0) return <Loading />;

  return (
    <div className="space-y-6">
      {/* ... GIỮ NGUYÊN HEADER + MODAL + FILTERS ... */}

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"} - {selectedCategory}
            </CardTitle>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorMessage message={error} />}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                  <TabsTrigger value="specs">Thông số</TabsTrigger>
                  <TabsTrigger value="variants">Biến thể</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="mt-6">
                  <ProductFormBasic
                    formData={formData}
                    handleChange={handleChange}
                    editingProduct={editingProduct}
                  />
                </TabsContent>
                <TabsContent value="specs" className="mt-6">
                  {/* ✅ NEW: RENDER SPECS FORM DỰA VÀO CATEGORY */}
                  {formData.category === "iPhone" || formData.category === "iPad" ? (
                    <IPhoneSpecsForm
                      specs={formData.specifications}
                      onChange={handleSpecChange}
                      onColorChange={handleColorChange}
                      onAddColor={addColor}
                      onRemoveColor={removeColor}
                    />
                  ) : formData.category === "Mac" ? (
                    <MacSpecsForm
                      specs={formData.specifications}
                      onChange={handleSpecChange}
                      onColorChange={handleColorChange}
                      onAddColor={addColor}
                      onRemoveColor={removeColor}
                    />
                  ) : formData.category === "AirPods" ? (
                    <AirPodsSpecsForm
                      specs={formData.specifications}
                      onChange={handleSpecChange}
                      onColorChange={handleColorChange}
                      onAddColor={addColor}
                      onRemoveColor={removeColor}
                    />
                  ) : formData.category === "Phụ kiện" ? (
                    <AccessoriesSpecsForm
                      customSpecs={formData.specifications.customSpecs}
                      onChange={handleCustomSpecChange}
                      onAdd={addCustomSpec}
                      onRemove={removeCustomSpec}
                    />
                  ) : formData.category === "Apple Watch" ? (
                    // ✅ THÊM APPLE WATCH SPECS FORM (tương tự iPhone hoặc tùy chỉnh)
                    <AppleWatchSpecsForm
                      specs={formData.specifications}
                      onChange={handleSpecChange}
                      onColorChange={handleColorChange}
                      onAddColor={addColor}
                      onRemoveColor={removeColor}
                    />
                  ) : null}
                </TabsContent>
                <TabsContent value="variants" className="mt-6">
                  {/* ✅ NEW: RENDER VARIANTS FORM DỰA VÀO CATEGORY */}
                  {formData.category === "iPhone" || formData.category === "iPad" ? (
                    <IPhoneVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleVariantOptionChange}
                      onAddVariant={addVariant}
                      onRemoveVariant={removeVariant}
                      onAddOption={addVariantOption}
                      onRemoveOption={removeVariantOption}
                    />
                  ) : formData.category === "Mac" ? (
                    <MacVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleVariantOptionChange}
                      onAddVariant={addVariant}
                      onRemoveVariant={removeVariant}
                      onAddOption={addVariantOption}
                      onRemoveOption={removeVariantOption}
                    />
                  ) : formData.category === "AirPods" ? (
                    <AirPodsVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleVariantOptionChange}
                      onAddVariant={addVariant}
                      onRemoveVariant={removeVariant}
                      onAddOption={addVariantOption}
                      onRemoveOption={removeVariantOption}
                    />
                  ) : formData.category === "Phụ kiện" ? (
                    <AccessoriesVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleVariantOptionChange}
                      onAddVariant={addVariant}
                      onRemoveVariant={removeVariant}
                      onAddOption={addVariantOption}
                      onRemoveOption={removeVariantOption}
                    />
                  ) : formData.category === "Apple Watch" ? (
                    <AppleWatchVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleVariantOptionChange}
                      onAddVariant={addVariant}
                      onRemoveVariant={removeVariant}
                      onAddOption={addVariantOption}
                      onRemoveOption={removeVariantOption}
                    />
                  ) : null}
                </TabsContent>
                <TabsContent value="media" className="mt-6">
                  <ProductFormMedia
                    formData={formData}
                    handleArrayChange={handleArrayChange}
                    addArrayItem={addArrayItem}
                    removeArrayItem={removeArrayItem}
                    previewImage={previewImage}
                  />
                </TabsContent>
              </Tabs>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang xử lý..." : editingProduct ? "Cập nhật" : "Tạo sản phẩm"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ... GIỮ NGUYÊN LIST PRODUCTS ... */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onUpdate={handleProductUpdate}
            onEdit={handleOpenForm}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
            Trước
          </Button>
          <span className="px-4 py-2">Trang {currentPage} / {totalPages}</span>
          <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
            Sau
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;