// FILE: src/pages/warehouse/ProductsPage.jsx - FIXED VERSION
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Download,
  X,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import { productAPI } from "@/lib/api";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
import { toast } from "sonner";

// ✅ Constants - Đặt ngoài component
const CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "Apple Watch",
  "AirPods",
  "Accessories",
];

const CATEGORY_SPECS = {
  iPhone: ["color", "storage", "ram", "screen", "chip", "camera", "battery"],
  iPad: ["color", "storage", "ram", "screen", "chip", "camera", "battery"],
  Mac: [
    "color",
    "storage",
    "ram",
    "screen",
    "chip",
    "gpu",
    "ports",
    "keyboard",
  ],
  "Apple Watch": ["caseSize", "caseMaterial", "bandType", "waterResistance"],
  AirPods: ["color", "chargingCase", "batteryLife", "noiseCancellation"],
  Accessories: ["color", "material", "compatibility", "type"],
};

// ✅ Helper functions - Đặt ngoài component
const getEmptyFormData = () => ({
  name: "",
  category: "iPhone",
  subcategory: "",
  model: "",
  price: "",
  originalPrice: "",
  discount: 0,
  quantity: "",
  status: "AVAILABLE",
  images: [""],
  description: "",
  features: [""],
  tags: [""],
  specifications: {},
  variants: [],
});

const emptyVariant = () => ({
  type: "Storage",
  name: "",
  options: [{ name: "", color: "", price: "", originalPrice: "" }],
});

// ✅ Component
const ProductsPage = () => {
  // Product states
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ Pagination - CHỈ KẾ BÁO 1 LẦN
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic"); // Thêm state để quản lý tab

  // Import states
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState("json");
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // ✅ Fetch products khi dependencies thay đổi
  useEffect(() => {
    fetchProducts();
  }, [searchTerm, categoryFilter, statusFilter, currentPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage, // ✅ Dùng currentPage
        limit: 12,
        search: searchTerm || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      const response = await productAPI.getAll(params);
      const {
        products,
        totalPages,
        currentPage: responsePage,
        total,
      } = response.data.data;

      setProducts(products);
      setTotalPages(totalPages);
      setTotalProducts(total);
      // Cập nhật currentPage từ response (đề phòng)
      if (responsePage !== currentPage) {
        setCurrentPage(responsePage);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Lỗi khi tải danh sách sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || "",
        model: product.model,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount || 0,
        quantity: product.quantity,
        status: product.status,
        images: product.images?.length > 0 ? product.images : [""], // ✅ Fix
        description: product.description || "",
        features: product.features?.length > 0 ? product.features : [""], // ✅ Fix
        tags: product.tags?.length > 0 ? product.tags : [""], // ✅ Fix
        specifications: product.specifications || {},
        variants: product.variants || [],
      });
    } else {
      setEditingProduct(null);
      setFormData(getEmptyFormData());
    }
    setError("");
    setShowForm(true);
  };

  const handleChange = (name, value) => {
    setError("");
    setFormData({ ...formData, [name]: value });
  };

  const handleSpecChange = (key, value) => {
    setFormData({
      ...formData,
      specifications: {
        ...formData.specifications,
        [key]: value,
      },
    });
  };

  const handleVariantChange = (variantIndex, field, value) => {
    const variants = [...formData.variants];
    variants[variantIndex] = { ...variants[variantIndex], [field]: value };
    setFormData({ ...formData, variants });
  };

  const handleVariantOptionChange = (
    variantIndex,
    optionIndex,
    field,
    value
  ) => {
    const variants = [...formData.variants];
    const options = [...(variants[variantIndex]?.options || [])];
    options[optionIndex] = { ...options[optionIndex], [field]: value };
    variants[variantIndex] = { ...variants[variantIndex], options };
    setFormData({ ...formData, variants });
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, emptyVariant()],
    });
  };

  const removeVariant = (variantIndex) => {
    const variants = formData.variants.filter((_, i) => i !== variantIndex);
    setFormData({ ...formData, variants });
  };

  const addVariantOption = (variantIndex) => {
    const variants = [...formData.variants];
    const options = [...(variants[variantIndex]?.options || [])];
    options.push({ name: "", color: "", price: "", originalPrice: "" });
    variants[variantIndex] = { ...variants[variantIndex], options };
    setFormData({ ...formData, variants });
  };

  const removeVariantOption = (variantIndex, optionIndex) => {
    const variants = [...formData.variants];
    const options = (variants[variantIndex]?.options || []).filter(
      (_, i) => i !== optionIndex
    );
    variants[variantIndex] = { ...variants[variantIndex], options };
    setFormData({ ...formData, variants });
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeArrayItem = (field, index) => {
    // ✅ Không cho xóa hết, giữ ít nhất 1 phần tử
    if (formData[field].length <= 1) {
      toast.error("Phải có ít nhất 1 mục");
      return;
    }
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const submitData = {
        ...formData,
        price: Number(formData.price || 0),
        originalPrice: Number(formData.originalPrice || 0),
        discount: Number(formData.discount || 0),
        quantity: Number(formData.quantity || 0),
        images: formData.images.filter((img) => img.trim() !== ""),
        features: formData.features.filter((f) => f.trim() !== ""),
        tags: formData.tags.filter((t) => t.trim() !== ""),
        variants: formData.variants.map((v) => ({
          type: v.type,
          name: v.name,
          options: (v.options || []).map((o) => ({
            name: o.name,
            color: o.color,
            price: Number(o.price || 0),
            originalPrice: Number(o.originalPrice || 0),
          })),
        })),
      };

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
      setError(
        error.response?.data?.message ||
          `${editingProduct ? "Cập nhật" : "Tạo"} sản phẩm thất bại`
      );
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

  // Import functions
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target.result;

        if (importType === "json") {
          const data = JSON.parse(content);
          setImportData(Array.isArray(data) ? data : data.products || []);
        } else {
          // CSV parsing (simple)
          const lines = content.split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());
          const data = lines
            .slice(1)
            .filter((line) => line.trim())
            .map((line) => {
              const values = line.split(",");
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = values[index]?.trim() || "";
              });
              return obj;
            });
          setImportData(data);
        }
        setError("");
      } catch (err) {
        setError("Lỗi đọc file: " + err.message);
        setImportData(null);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData || importData.length === 0) {
      setError("Không có dữ liệu để import");
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      let response;
      if (importType === "json") {
        response = await productAPI.bulkImportJSON({ products: importData });
      } else {
        response = await productAPI.bulkImportCSV({ csvData: importData });
      }

      setImportResults(response.data.data);
      toast.success(response.data.message);
      await fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || "Import thất bại");
      toast.error("Import thất bại");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await productAPI.exportCSV({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      const csvData = response.data.data;
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => headers.map((h) => row[h]).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Export thành công");
    } catch (error) {
      toast.error("Export thất bại");
    }
  };

  const downloadTemplate = () => {
    const template =
      importType === "json"
        ? {
            products: [
              {
                name: "iPhone 17 Pro Max",
                category: "iPhone",
                subcategory: "Pro",
                model: "iPhone 17 Pro Max",
                price: 29990000,
                originalPrice: 32990000,
                discount: 9,
                quantity: 50,
                status: "AVAILABLE",
                images: ["/images/iphone17pm.png"],
                description: "iPhone 17 Pro Max với màn hình lớn nhất",
                features: ["Màn hình Super Retina XDR", "Chip A19 Pro"],
                tags: ["premium", "pro"],
                specifications: {
                  color: "Natural Titanium",
                  storage: "256GB",
                  screen: '6.9"',
                  chip: "A19 Pro",
                  camera: "48MP",
                  battery: "4,422 mAh",
                },
                variants: [
                  {
                    type: "Storage",
                    name: "256GB",
                    options: [
                      {
                        name: "Natural Titanium",
                        color: "Natural Titanium",
                        price: 29990000,
                        originalPrice: 32990000,
                      },
                    ],
                  },
                ],
              },
            ],
          }
        : `name,category,subcategory,model,price,originalPrice,discount,quantity,status,images,description,features,tags,spec_color,spec_storage,spec_screen,spec_chip,spec_camera,spec_battery,variants
iPhone 17 Pro Max,iPhone,Pro,iPhone 17 Pro Max,29990000,32990000,9,50,AVAILABLE,/images/iphone17pm.png,"iPhone 17 Pro Max","Màn hình Super Retina XDR,Chip A19 Pro","premium,pro",Natural Titanium,256GB,6.9",A19 Pro,48MP,4422 mAh,"[{""type"":""Storage"",""name"":""256GB"",""options"":[{""name"":""Natural Titanium"",""color"":""Natural Titanium"",""price"":29990000,""originalPrice"":32990000}]}]"`;

    const blob = new Blob(
      [importType === "json" ? JSON.stringify(template, null, 2) : template],
      { type: importType === "json" ? "application/json" : "text/csv" }
    );
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template.${importType}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading && products.length === 0) {
    return <Loading />;
  }

  const currentSpecs = CATEGORY_SPECS[formData.category] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">
            Tổng số: {totalProducts} sản phẩm
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(!showImport)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle>Import sản phẩm</CardTitle>
            <CardDescription>
              Upload file JSON hoặc CSV để thêm nhiều sản phẩm cùng lúc
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>Loại file</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Tải file mẫu
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Chọn file</Label>
              <Input
                type="file"
                accept={importType === "json" ? ".json" : ".csv"}
                onChange={handleFileChange}
              />
            </div>

            {error && <ErrorMessage message={error} />}

            {importData && (
              <div className="border rounded p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Đã tải {importData.length} sản phẩm
                  </span>
                  <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting ? "Đang import..." : "Import ngay"}
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto text-sm">
                  {importData.slice(0, 5).map((item, i) => (
                    <div key={i} className="py-1 border-b last:border-0">
                      {item.name || "Unknown"} - {item.category}
                    </div>
                  ))}
                  {importData.length > 5 && (
                    <div className="py-1 text-muted-foreground">
                      ... và {importData.length - 5} sản phẩm khác
                    </div>
                  )}
                </div>
              </div>
            )}

            {importResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span>Thành công: {importResults.success.length}</span>
                </div>
                {importResults.failed.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span>Thất bại: {importResults.failed.length}</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-sm">
                      {importResults.failed.map((item, i) => (
                        <div key={i} className="py-1 text-red-600">
                          {item.name}: {item.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                <SelectItem value="DISCONTINUED">Ngừng KD</SelectItem>
                <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorMessage message={error} />}

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                  <TabsTrigger value="specs">Thông số</TabsTrigger>
                  <TabsTrigger value="variants">Biến thể</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>

                <TabsContent
                  value="basic"
                  className="space-y-4 mt-6 border border-red-500"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên sản phẩm *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Danh mục *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          handleChange("category", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Phân loại con</Label>
                      <Input
                        value={formData.subcategory}
                        onChange={(e) =>
                          handleChange("subcategory", e.target.value)
                        }
                        placeholder="vd: Pro, Air, Mini..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model *</Label>
                      <Input
                        value={formData.model}
                        onChange={(e) => handleChange("model", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Giá gốc *</Label>
                      <Input
                        type="number"
                        value={formData.originalPrice}
                        onChange={(e) =>
                          handleChange("originalPrice", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Giá bán *</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => handleChange("price", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Giảm giá (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount}
                        onChange={(e) =>
                          handleChange("discount", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Số lượng *</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) =>
                          handleChange("quantity", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleChange("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                          <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                          <SelectItem value="DISCONTINUED">Ngừng KD</SelectItem>
                          <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent
                  value="specs"
                  className="space-y-4 mt-6 border border-red-500"
                >
                  <p className="text-blue-500">Nội dung tab Thông số (Debug)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSpecs.map((spec) => (
                      <div key={spec} className="space-y-2">
                        <Label>{spec}</Label>
                        <Input
                          value={formData.specifications[spec] || ""}
                          onChange={(e) =>
                            handleSpecChange(spec, e.target.value)
                          }
                          placeholder={`Nhập ${spec}`}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent
                  value="variants"
                  className="space-y-4 mt-6 border border-red-500"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Biến thể sản phẩm</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariant}
                    >
                      Thêm biến thể
                    </Button>
                  </div>
                  {formData.variants.map((variant, vIdx) => (
                    <div key={vIdx} className="border rounded-md p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Loại</Label>
                          <Input
                            value={variant.type}
                            onChange={(e) =>
                              handleVariantChange(vIdx, "type", e.target.value)
                            }
                            placeholder="vd: Storage, Size..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Giá trị</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) =>
                              handleVariantChange(vIdx, "name", e.target.value)
                            }
                            placeholder="vd: 256GB, 42mm..."
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addVariantOption(vIdx)}
                          >
                            + Option
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeVariant(vIdx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(variant.options || []).map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="grid grid-cols-1 md:grid-cols-5 gap-2"
                          >
                            <Input
                              placeholder="Tên"
                              value={opt.name}
                              onChange={(e) =>
                                handleVariantOptionChange(
                                  vIdx,
                                  oIdx,
                                  "name",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              placeholder="Màu"
                              value={opt.color}
                              onChange={(e) =>
                                handleVariantOptionChange(
                                  vIdx,
                                  oIdx,
                                  "color",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              placeholder="Giá gốc"
                              type="number"
                              value={opt.originalPrice}
                              onChange={(e) =>
                                handleVariantOptionChange(
                                  vIdx,
                                  oIdx,
                                  "originalPrice",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              placeholder="Giá bán"
                              type="number"
                              value={opt.price}
                              onChange={(e) =>
                                handleVariantOptionChange(
                                  vIdx,
                                  oIdx,
                                  "price",
                                  e.target.value
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeVariantOption(vIdx, oIdx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent
                  value="media"
                  className="space-y-4 mt-6 border border-red-500"
                >
                  <p className="text-blue-500">Nội dung tab Media (Debug)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Hình ảnh</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem("images")}
                      >
                        Thêm ảnh
                      </Button>
                    </div>
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={img}
                          onChange={(e) =>
                            handleArrayChange("images", idx, e.target.value)
                          }
                          placeholder="URL hình ảnh"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeArrayItem("images", idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tính năng nổi bật</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem("features")}
                      >
                        Thêm tính năng
                      </Button>
                    </div>
                    {formData.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) =>
                            handleArrayChange("features", idx, e.target.value)
                          }
                          placeholder="Tính năng"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeArrayItem("features", idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tags</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem("tags")}
                      >
                        Thêm tag
                      </Button>
                    </div>
                    {formData.tags.map((tag, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={tag}
                          onChange={(e) =>
                            handleArrayChange("tags", idx, e.target.value)
                          }
                          placeholder="Tag"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeArrayItem("tags", idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <Button type="submit" disabled={isSubmitting}>
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

      {/* Filters
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                <SelectItem value="DISCONTINUED">Ngừng KD</SelectItem>
                <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card> */}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <Card key={product._id} className="overflow-hidden">
            <div className="aspect-square relative bg-gray-100">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <Badge
                className={`absolute top-2 right-2 ${getStatusColor(
                  product.status
                )}`}
              >
                {getStatusText(product.status)}
              </Badge>
              <Badge className="absolute top-2 left-2 bg-blue-500">
                {product.category}
              </Badge>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {product.model}
              </p>

              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {product.discount > 0 && (
                    <Badge variant="destructive">-{product.discount}%</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-muted-foreground">Tồn kho:</span>
                <span
                  className={`font-semibold ${
                    product.quantity > 10
                      ? "text-green-600"
                      : product.quantity > 0
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}
                >
                  {product.quantity}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenForm(product)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Sửa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(product._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination - ✅ FIX */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Trước
          </Button>
          <span className="px-4 py-2 flex items-center">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
