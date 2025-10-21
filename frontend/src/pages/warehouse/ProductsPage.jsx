// ============================================
// FILE: src/pages/warehouse/ProductsPage.jsx
// ✅ FIXED: "Thêm sản phẩm" Modal + Form Issues
// ============================================

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ProductCard } from "@/components/shared/ProductCard";
import { Plus, X } from "lucide-react";
import { productAPI } from "@/lib/api";
import { toast } from "sonner";
import { CATEGORIES, getEmptySpecs } from "@/lib/productConstants";

// ✅ IMPORT ALL COMPONENTS
import ProductFormBasic from "@/components/shared/ProductFormBasic";
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import ProductFormMedia from "@/components/shared/ProductFormMedia";
import ProductCategoryModal from "@/components/shared/ProductCategoryModal";

const ProductsPage = () => {
  // ✅ FUNCTIONS FIRST
  const emptyVariant = () => ({
    color: "",
    images: [""],
    options: [
      {
        size: "",
        version: "",
        connection: "",
        price: "",
        originalPrice: "",
        quantity: "",
      },
    ],
  });

  const getEmptyFormData = (category = "iPhone") => ({
    name: "",
    model: "",
    category,
    condition: "NEW",
    price: "",
    originalPrice: "",
    discount: 0,
    quantity: "",
    status: "AVAILABLE",
    description: "",
    specifications: getEmptySpecs(category),
    variants: [emptyVariant()],
    images: [""],
    badges: [],
  });

  // ✅ STATES
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ category: "all", status: "all" });
  const [pagination, setPagination] = useState({ page: 1, limit: 12 });
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
  }, [searchTerm, filters.category, pagination.page]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        category: filters.category === "all" ? undefined : filters.category,
      };
      const response = await productAPI.getAll(params);
      setProducts(response.data.data.products);
    } catch (error) {
      toast.error("Lỗi tải sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setSelectedCategory(product.category);
      setFormData({
        ...product,
        variants: product.variants?.length ? product.variants : [emptyVariant()],
        images: product.images?.length ? product.images : [""],
      });
      setPreviewImage(product.images?.[0] || null);
      setShowForm(true);
      setShowCategoryModal(false);
    } else {
      setEditingProduct(null);
      setSelectedCategory("iPhone");
      setSelectedCondition("NEW");
      setShowCategoryModal(true); // ✅ ĐẢM BẢO MỞ MODAL
    }
    setError("");
    setActiveTab("basic");
  };

  const handleCategorySubmit = () => {
    setFormData(getEmptyFormData(selectedCategory));
    setFormData((prev) => ({ ...prev, condition: selectedCondition })); // ✅ CẬP NHẬT CONDITION
    setShowForm(true);
    setShowCategoryModal(false);
  };

  const handleChange = (name, value) => {
    setError("");
    const updatedFormData = { ...formData, [name]: value };
    if (name === "originalPrice" || name === "price") {
      const origPrice = Number(updatedFormData.originalPrice) || 0;
      const sellPrice = Number(updatedFormData.price) || 0;
      updatedFormData.discount =
        origPrice > 0
          ? Math.round(((origPrice - sellPrice) / origPrice) * 100)
          : 0;
    }
    setFormData(updatedFormData);
  };

  const handleVariantChange = (vIdx, field, value) => {
    const variants = [...formData.variants];
    variants[vIdx][field] = value;
    setFormData({ ...formData, variants });
  };

  const handleOptionChange = (vIdx, oIdx, field, value) => {
    const variants = [...formData.variants];
    variants[vIdx].options[oIdx][field] = value;
    setFormData({ ...formData, variants });
  };

  const handleAddVariant = () =>
    setFormData({ ...formData, variants: [...formData.variants, emptyVariant()] });

  const handleRemoveVariant = (vIdx) =>
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== vIdx),
    });

  const handleAddOption = (vIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].options.push(emptyVariant().options[0]);
    setFormData({ ...formData, variants });
  };

  const handleRemoveOption = (vIdx, oIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].options = variants[vIdx].options.filter((_, i) => i !== oIdx);
    setFormData({ ...formData, variants });
  };

  const handleArrayChange = (field, idx, val) => {
    const arr = [...formData[field]];
    arr[idx] = val;
    setFormData({ ...formData, [field]: arr });
  };

  const addArrayItem = (field) =>
    setFormData({ ...formData, [field]: [...formData[field], ""] });

  const removeArrayItem = (field, idx) => {
    if (formData[field].length <= 1) return;
    const arr = formData[field].filter((_, i) => i !== idx);
    setFormData({ ...formData, [field]: arr });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.model.trim()) {
      toast.error("Vui lòng nhập model sản phẩm");
      return;
    }
    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        price: Number(formData.price || 0),
        originalPrice: Number(formData.originalPrice || 0),
        quantity: Number(formData.quantity || 0),
        variants: formData.variants
          .filter((v) => v.color.trim())
          .map((v) => ({
            color: v.color,
            images: v.images.filter((img) => img.trim()),
            options: v.options.map((o) => ({
              ...o,
              price: Number(o.price || 0),
              quantity: Number(o.quantity || 0),
            })),
          })),
        images: formData.images.filter((img) => img.trim()),
      };
      if (editingProduct) {
        await productAPI.update(editingProduct._id, submitData);
        toast.success("Cập nhật thành công");
      } else {
        await productAPI.create(submitData);
        toast.success("Tạo sản phẩm thành công");
      }
      await fetchProducts();
      setShowForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;
    try {
      await productAPI.delete(productId);
      toast.success("Xóa thành công");
      await fetchProducts();
    } catch (error) {
      toast.error("Xóa thất bại");
    }
  };

  if (isLoading && products.length === 0) return <Loading />;

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">Tổng {products.length} sản phẩm</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* FILTERS */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={filters.category}
              onValueChange={(val) => setFilters({ ...filters, category: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all" value="all">Tất cả</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchProducts} variant="outline">
              Lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MODAL */}
      {showCategoryModal && (
        <ProductCategoryModal
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedCondition={selectedCondition}
          setSelectedCondition={setSelectedCondition}
          onSubmit={handleCategorySubmit}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* FORM */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {editingProduct ? "Chỉnh sửa" : "Thêm"} - {selectedCategory}
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
                  {formData.category === "iPhone" && (
                    <IPhoneSpecsForm
                      specs={formData.specifications}
                      onChange={handleChange}
                    />
                  )}
                  {formData.category === "Mac" && (
                    <MacSpecsForm
                      specs={formData.specifications}
                      onChange={handleChange}
                    />
                  )}
                  {formData.category === "AirPods" && (
                    <AirPodsSpecsForm
                      specs={formData.specifications}
                      onChange={handleChange}
                    />
                  )}
                  {formData.category === "Phụ kiện" && (
                    <AccessoriesSpecsForm
                      specs={formData.specifications}
                      onChange={handleChange}
                    />
                  )}
                  {formData.category === "Apple Watch" && (
                    <AppleWatchSpecsForm
                      specs={formData.specifications}
                      onChange={handleChange}
                    />
                  )}
                </TabsContent>

                <TabsContent value="variants" className="mt-6">
                  {formData.category === "iPhone" && (
                    <IPhoneVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleOptionChange}
                      onAddVariant={handleAddVariant}
                      onRemoveVariant={handleRemoveVariant}
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />
                  )}
                  {formData.category === "Mac" && (
                    <MacVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleOptionChange}
                      onAddVariant={handleAddVariant}
                      onRemoveVariant={handleRemoveVariant}
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />
                  )}
                  {formData.category === "AirPods" && (
                    <AirPodsVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleOptionChange}
                      onAddVariant={handleAddVariant}
                      onRemoveVariant={handleRemoveVariant}
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />
                  )}
                  {formData.category === "Phụ kiện" && (
                    <AccessoriesVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleOptionChange}
                      onAddVariant={handleAddVariant}
                      onRemoveVariant={handleRemoveVariant}
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />
                  )}
                  {formData.category === "Apple Watch" && (
                    <AppleWatchVariantsForm
                      variants={formData.variants}
                      onVariantChange={handleVariantChange}
                      onOptionChange={handleOptionChange}
                      onAddVariant={handleAddVariant}
                      onRemoveVariant={handleRemoveVariant}
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />
                  )}
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
                {isSubmitting
                  ? "Đang xử lý..."
                  : editingProduct
                  ? "Cập nhật"
                  : "Tạo sản phẩm"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* PRODUCTS GRID */}
      <Card>
        <CardHeader>
          <CardTitle>Kết quả ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onDelete={handleDelete}
                onEdit={handleOpenForm}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;