import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ProductCard } from "@/components/shared/ProductCard";
import ProductFormBasic from "@/components/shared/ProductFormBasic";
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";
import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";
import ProductFormMedia from "@/components/shared/ProductFormMedia";
import { Trash2, Plus, Pencil, Package, X } from "lucide-react";
import { productAPI } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "Apple Watch",
  "Accessories",
];

const CONDITION_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Like New", label: "Like New" },
];

const getEmptyFormData = (category = "iPhone") => ({
  name: "",
  model: "",
  category,
  condition: "New",
  originalPrice: "",
  salePrice: "",
  discount: 0,
  quantity: "",
  status: "AVAILABLE",
  description: "",
  specifications: getEmptySpecs(category),
  variants: [],
  images: [""],
});

const getEmptySpecs = (category) => {
  switch (category) {
    case "iPhone":
    case "iPad":
      return {
        chip: "",
        ram: "",
        storage: "",
        screenSize: "",
        screenTechnology: "",
        battery: "",
        operatingSystem: "",
        screenResolution: "",
        ports: "",
      };
    case "Mac":
      return {
        chip: "",
        graphicsCard: "",
        ram: "",
        storage: "",
        screenSize: "",
        screenTechnology: "",
        battery: "",
        operatingSystem: "",
        screenResolution: "",
        cpuType: "",
        ports: "",
      };
    case "AirPods":
      return {
        chipset: "",
        brand: "",
        soundTechnology: "",
        batteryLife: "",
        controlMethod: "",
        microphone: "",
        connectorType: "",
        additionalFeatures: "",
      };
    case "Apple Watch":
      return {
        chip: "",
        ram: "",
        storage: "",
        screenSize: "",
        screenTechnology: "",
        battery: "",
        operatingSystem: "",
        screenResolution: "",
        ports: "",
      };
    case "Accessories":
      return {
        customAttributes: [{ key: "", value: "" }],
      };
    default:
      return {};
  }
};

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
  const [selectedCondition, setSelectedCondition] = useState("New");
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
  const params = new URLSearchParams();
  params.append('page', currentPage);
  params.append('limit', 12);
  if (searchTerm) params.append('search', searchTerm);
  if (categoryFilter !== "all") params.append('category', categoryFilter);
  if (statusFilter !== "all") params.append('status', statusFilter);
  
  const response = await productAPI.getAll(`?${params.toString()}`);
  const { products, totalPages, currentPage: responsePage, total } = response.data.data || {};
  setProducts(products || []);
  setTotalPages(totalPages || 1);
  setTotalProducts(total || 0);
  if (responsePage && responsePage !== currentPage) setCurrentPage(responsePage);
  } catch (error) {
  console.error("Detailed error fetching products:", error.response || error);
  toast.error("Lỗi khi tải danh sách sản phẩm: " + (error.response?.data?.message || error.message));
  } finally {
  setIsLoading(false);
  }
  };

  const handleOpenForm = (product = null) => {
    if (product) {
      // EDIT MODE
      setEditingProduct(product);
      setFormData({
        ...getEmptyFormData(product.category),
        ...product,
        variants: product.variants || [],
      });
      setPreviewImage(product.images?.[0] || null);
      setShowForm(true);
      setShowCategoryModal(false);
    } else {
      // NEW MODE
      setEditingProduct(null);
      setSelectedCategory("iPhone");
      setSelectedCondition("New");
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
    setFormData({ ...formData, [name]: value });
    if (name === "originalPrice" || name === "salePrice") {
      const orig = Number(formData.originalPrice) || 0;
      const sale = Number(formData.salePrice) || 0;
      formData.discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;
    }
  };

  const handleSpecsChange = (newSpecs) => {
    setFormData({ ...formData, specifications: newSpecs });
  };

  const handleVariantsChange = (newVariants) => {
    setFormData({ ...formData, variants: newVariants });
  };

  const handleMediaChange = (newImages) => {
    setFormData({ ...formData, images: newImages });
    setPreviewImage(newImages[0] || null);
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
      const submitData = { ...formData };
      if (editingProduct) {
        await productAPI.update(editingProduct._id, submitData);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await productAPI.create(submitData);
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
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await productAPI.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  if (isLoading && products.length === 0) return <Loading />;

  const renderSpecsForm = () => {
  const props = { specs: formData.specifications, onSpecsChange: handleSpecsChange };
  switch (formData.category) {
  case "iPhone":
  case "iPad":
  case "Apple Watch":
  return <IPhoneSpecsForm {...props} />;
  case "Mac":
  return <MacSpecsForm {...props} />;
  case "AirPods":
  return <AirPodsSpecsForm {...props} />;
  case "Accessories":
  return <AccessoriesSpecsForm {...props} />;
  default:
  return null;
  }
  };

  const renderVariantsForm = () => {
  const props = { variants: formData.variants, onVariantsChange: handleVariantsChange };
  switch (formData.category) {
  case "iPhone":
  case "iPad":
  case "Apple Watch":
  return <IPhoneVariantsForm {...props} />;
  case "Mac":
  return <MacVariantsForm {...props} />;
  case "AirPods":
  return <AirPodsVariantsForm {...props} />;
  case "Accessories":
  return <AccessoriesVariantsForm {...props} />;
  default:
  return null;
  }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">Tổng số: {totalProducts} sản phẩm</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
        </Button>
      </div>

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
              <Label>Trạng thái</Label>
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

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</CardTitle>
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

                <TabsContent value="basic" className="space-y-4 mt-6">
                  <ProductFormBasic formData={formData} handleChange={handleChange} editingProduct={editingProduct} />
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 mt-6">
                  {renderSpecsForm()}
                </TabsContent>

                <TabsContent value="variants" className="space-y-4 mt-6">
                  {renderVariantsForm()}
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-6">
                  <ProductFormMedia formData={formData} handleChange={handleMediaChange} previewImage={previewImage} />
                </TabsContent>
              </Tabs>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang xử lý..." : editingProduct ? "Cập nhật" : "Tạo sản phẩm"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Danh mục" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} onEdit={() => handleOpenForm(product)} onDelete={() => handleDelete(product._id)} />
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