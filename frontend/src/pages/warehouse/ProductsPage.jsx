// FILE: src/pages/warehouse/ProductsPage.jsx

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ProductCard } from "@/components/shared/ProductCard";
import { Trash2, Plus, Pencil, Package, X } from "lucide-react";
import { productAPI } from "@/lib/api";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
import { toast } from "sonner";

// Import category-specific components
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import IPadSpecsForm from "@/components/shared/specs/IPadSpecsForm"; // Assume exists based on directory
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";

import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import IPadVariantsForm from "@/components/shared/variants/IPadVariantsForm"; // Assume
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";

// Shared basic form (adjusted: remove price, quantity etc. since per variant)
import ProductFormBasic from "@/components/shared/ProductFormBasic";
import ProductFormMedia from "@/components/shared/ProductFormMedia"; // But since images per variant, may remove or adjust

// Import API functions
import { iPhoneAPI, iPadAPI, macAPI, airPodsAPI, appleWatchAPI, accessoryAPI } from "@/lib/api";

const CATEGORIES = [
  "iPhone",
  "iPad", 
  "Mac",
  "AirPods",
  "Apple Watch",
  "Phụ kiện",
];

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New (Mới 100%)" },
  { value: "LIKE_NEW", label: "Like New (99%)" },
];

const getEmptyFormData = (category = "iPhone") => ({
  name: "",
  model: "",
  category,
  condition: "NEW",
  status: "AVAILABLE",
  description: "",
  specifications: {}, // Will be handled by specific form
  variants: [], // Will be handled by specific form
  badges: [],
});

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

  // Category to API mapping
  const apiMap = {
    'iPhone': iPhoneAPI,
    'iPad': iPadAPI,
    'Mac': macAPI,
    'AirPods': airPodsAPI,
    'Apple Watch': appleWatchAPI,
    'Phụ kiện': accessoryAPI,
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, categoryFilter, statusFilter, currentPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let products = [];
      if (categoryFilter !== 'all') {
        const api = apiMap[categoryFilter];
        const response = await api.getAll({ page: currentPage, limit: 12, search: searchTerm || undefined, status: statusFilter !== 'all' ? statusFilter : undefined });
        products = response.data; // Adjust based on response structure
      } else {
        const responses = await Promise.all(Object.values(apiMap).map(api => api.getAll({ page: currentPage, limit: 12, search: searchTerm || undefined, status: statusFilter !== 'all' ? statusFilter : undefined })));
        products = responses.flatMap(res => res.data);
      }
      setProducts(products);
      // ... set total etc.
    } catch (error) {
      toast.error("Lỗi khi tải danh sách sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (product = null) => {
    if (product) {
      // EDIT MODE
      setEditingProduct(product);
      setFormData({
        name: product.name,
        model: product.model || "",
        category: product.category,
        condition: product.condition || "NEW",
        status: product.status,
        description: product.description || "",
        specifications: product.specifications || {},
        variants: product.variants || [], // Assume populated or fetch if needed
        badges: product.badges || [],
      });
      setShowForm(true);
      setShowCategoryModal(false);
    } else {
      // NEW MODE - SHOW CATEGORY MODAL
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

  const updateFormData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
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
        status: formData.status,
        description: formData.description,
        specifications: formData.specifications,
        variants: formData.variants.map((v) => ({
          color: v.color,
          // Adjust per category, but since specific forms handle, assume v is ready
        })),
        badges: formData.badges,
      };

      const api = apiMap[formData.category];
      if (editingProduct) {
        await api.update(editingProduct._id, submitData);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await api.create(submitData);
        toast.success("Tạo sản phẩm thành công");
      }
      await fetchProducts();
      setShowForm(false);
    } catch (error) {
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

  const renderSpecsForm = () => {
    const props = { formData, updateFormData };
    switch (formData.category) {
      case "iPhone":
        return <IPhoneSpecsForm {...props} />;
      case "iPad":
        return <IPadSpecsForm {...props} />;
      case "Mac":
        return <MacSpecsForm {...props} />;
      case "AirPods":
        return <AirPodsSpecsForm {...props} />;
      case "Apple Watch":
        return <AppleWatchSpecsForm {...props} />;
      case "Phụ kiện":
        return <AccessoriesSpecsForm {...props} />;
      default:
        return null;
    }
  };

  const renderVariantsForm = () => {
    const props = { formData, updateFormData };
    switch (formData.category) {
      case "iPhone":
        return <IPhoneVariantsForm {...props} />;
      case "iPad":
        return <IPadVariantsForm {...props} />;
      case "Mac":
        return <MacVariantsForm {...props} />;
      case "AirPods":
        return <AirPodsVariantsForm {...props} />;
      case "Apple Watch":
        return <AppleWatchVariantsForm {...props} />;
      case "Phụ kiện":
        return <AccessoriesVariantsForm {...props} />;
      default:
        return null;
    }
  };

  if (isLoading && products.length === 0) return <Loading />;

  return (
    <div className="space-y-6">
      {/* ... Header and add button same ... */}

      {/* CATEGORY MODAL same */}

      {/* FORM */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </CardTitle>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorMessage message={error} />}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                  <TabsTrigger value="specs">Thông số</TabsTrigger>
                  <TabsTrigger value="variants">Biến thể</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-6">
                  <ProductFormBasic formData={formData} updateFormData={updateFormData} editing={!!editingProduct} />
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 mt-6">
                  {renderSpecsForm()}
                </TabsContent>

                <TabsContent value="variants" className="space-y-4 mt-6">
                  {renderVariantsForm()}
                </TabsContent>

              </Tabs>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang xử lý..." : editingProduct ? "Cập nhật" : "Tạo sản phẩm"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ... Rest of page same: search, filter, grid, pagination ... */}
    </div>
  );
};

export default ProductsPage;
