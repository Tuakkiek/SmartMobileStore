// FILE: src/pages/warehouse/ProductsPage.jsx - UPDATED WITH PRODUCTCARD
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ProductCard } from "@/components/shared/ProductCard";
import { Trash2, Plus, Pencil, Package } from "lucide-react";
import { productAPI } from "@/lib/api";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "Apple Watch",
  "Phụ kiện",
];

const CATEGORY_SPECS = {
  iPhone: [
    "screenSize",
    "cpu",
    "operatingSystem",
    "storage",
    "ram",
    "mainCamera",
    "frontCamera",
    "battery",
    "colors",
  ],
  iPad: [
    "screenSize",
    "cpu",
    "operatingSystem",
    "storage",
    "ram",
    "mainCamera",
    "frontCamera",
    "battery",
    "colors",
  ],
  Mac: [
    "screenSize",
    "cpu",
    "operatingSystem",
    "storage",
    "ram",
    "gpu",
    "ports",
    "keyboard",
    "colors",
  ],
  "Apple Watch": [
    "caseSize",
    "caseMaterial",
    "bandType",
    "waterResistance",
    "colors",
  ],
  AirPods: ["chargingCase", "batteryLife", "noiseCancellation", "colors"],
  "Phụ kiện": ["material", "compatibility", "type", "colors"],
};

const getEmptyFormData = () => ({
  name: "",
  model: "",
  category: "iPhone",
  price: "",
  originalPrice: "",
  discount: 0,
  quantity: "",
  status: "AVAILABLE",
  description: "",
  specifications: {
    screenSize: "",
    cpu: "",
    operatingSystem: "",
    storage: "",
    ram: "",
    mainCamera: "",
    frontCamera: "",
    battery: "",
    colors: [""],
  },
  variants: [],
  images: [""],
  badges: [],
});

const emptyVariant = () => ({
  color: "",
  imageUrl: "",
  options: [
    { capacity: "", price: "", originalPrice: "", quantity: "" },
  ],
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
        page: currentPage,
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
      if (responsePage !== currentPage) setCurrentPage(responsePage);
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
        model: product.model || "",
        category: product.category,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount || 0,
        quantity: product.quantity,
        status: product.status,
        description: product.description || "",
        specifications: {
          screenSize: product.specifications?.screenSize || "",
          cpu: product.specifications?.cpu || "",
          operatingSystem: product.specifications?.operatingSystem || "",
          storage: product.specifications?.storage || "",
          ram: product.specifications?.ram || "",
          mainCamera: product.specifications?.mainCamera || "",
          frontCamera: product.specifications?.frontCamera || "",
          battery: product.specifications?.battery || "",
          colors: product.specifications?.colors || [""],
        },
        variants: product.variants?.map((v) => ({
          color: v.name || v.options[0]?.color || "",
          imageUrl: v.options[0]?.imageUrl || "",
          options: v.options.map((o) => ({
            capacity: o.name || "",
            price: o.price || "",
            originalPrice: o.originalPrice || "",
            quantity: o.quantity || "",
          })),
        })) || [],
        images: product.images?.length > 0 ? product.images : [""],
        badges: product.badges || [],
      });
      setPreviewImage(product.images?.[0] || null);
    } else {
      setEditingProduct(null);
      setFormData(getEmptyFormData());
      setPreviewImage(null);
    }
    setError("");
    setShowForm(true);
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

  const handleSpecChange = (key, value) => {
    setFormData({
      ...formData,
      specifications: { ...formData.specifications, [key]: value },
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
        if (images[0] === "") {
          images[0] = value;
        } else {
          images.push(value);
        }
        newFormData = { ...newFormData, images };
      }
    }
    setFormData(newFormData);
  };

  const handleVariantOptionChange = (
    variantIndex,
    optionIndex,
    field,
    value
  ) => {
    const variants = [...formData.variants];
    const options = [...variants[variantIndex].options];
    options[optionIndex][field] = value;
    variants[variantIndex].options = options;
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
    const options = [...variants[variantIndex].options];
    let defaultCapacity = "128GB";
    if (options.length > 0) {
      const last = options[options.length - 1].capacity;
      const match = last.match(/^(\d+)(GB|TB)$/);
      if (match) {
        let num = parseInt(match[1]);
        const unit = match[2];
        if (unit === "TB") num *= 1024;
        const nextNum = num * 2;
        defaultCapacity = nextNum >= 1024 ? `${nextNum / 1024}TB` : `${nextNum}GB`;
      }
    }
    options.push({
      capacity: defaultCapacity,
      price: "",
      originalPrice: "",
      quantity: "",
    });
    variants[variantIndex].options = options;
    setFormData({ ...formData, variants });
  };

  const removeVariantOption = (variantIndex, optionIndex) => {
    const variants = [...formData.variants];
    const options = variants[variantIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    variants[variantIndex].options = options;
    setFormData({ ...formData, variants });
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    if (field === "images" && index === 0 && value) setPreviewImage(value);
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

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
        price: Number(formData.price || 0),
        originalPrice: Number(formData.originalPrice || 0),
        discount: Number(formData.discount || 0),
        quantity: Number(formData.quantity || 0),
        status: formData.status,
        description: formData.description,
        specifications: {
          ...formData.specifications,
          colors: formData.specifications.colors.filter((c) => c.trim() !== ""),
        },
        variants: formData.variants.map((v) => ({
          type: "Color",
          name: v.color,
          options: v.options.map((o) => ({
            name: o.capacity,
            color: v.color,
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
        await productAPI.create(submitData);
        toast.success("Tạo sản phẩm thành công");
      }
      await fetchProducts();
      setShowForm(false);
    } catch (error) {
      console.error("Submit error:", error);
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

  const handleProductUpdate = async (productId, data) => {
    try {
      await productAPI.update(productId, data);
      await fetchProducts();
      toast.success("Cập nhật sản phẩm thành công");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Cập nhật sản phẩm thất bại"
      );
    }
  };

  if (isLoading && products.length === 0) return <Loading />;

  const currentSpecs = CATEGORY_SPECS[formData.category] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">
            Tổng số: {totalProducts} sản phẩm
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
        </Button>
      </div>

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

                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên sản phẩm</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.model}
                        onChange={(e) => handleChange("model", e.target.value)}
                        placeholder="VD: iPhone 14 Pro Max"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Danh mục</Label>
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
                      <Label>Giá gốc</Label>
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
                      <Label>Giá bán</Label>
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
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) =>
                          handleChange("quantity", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
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

                <TabsContent value="specs" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSpecs.map((spec) => (
                      <div key={spec} className="space-y-2">
                        <Label>
                          {spec === "screenSize"
                            ? "Kích thước màn hình"
                            : spec === "cpu"
                            ? "CPU"
                            : spec === "operatingSystem"
                            ? "Hệ điều hành"
                            : spec === "storage"
                            ? "Dung lượng lưu trữ"
                            : spec === "ram"
                            ? "RAM"
                            : spec === "mainCamera"
                            ? "Camera chính"
                            : spec === "frontCamera"
                            ? "Camera phụ"
                            : spec === "battery"
                            ? "Dung lượng pin"
                            : "Màu sắc"}
                        </Label>
                        {spec === "colors" ? (
                          <div>
                            {formData.specifications.colors.map(
                              (color, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                  <Input
                                    value={color}
                                    onChange={(e) =>
                                      handleColorChange(index, e.target.value)
                                    }
                                    placeholder="Nhập màu sắc"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => removeColor(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addColor}
                              className="mt-2"
                            >
                              <Plus className="w-4 h-4 mr-2" /> Thêm màu
                            </Button>
                          </div>
                        ) : (
                          <Input
                            value={formData.specifications[spec] || ""}
                            onChange={(e) =>
                              handleSpecChange(spec, e.target.value)
                            }
                            placeholder={`Nhập ${spec}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="variants" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Biến thể sản phẩm</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariant}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Thêm màu
                    </Button>
                  </div>
                  {formData.variants.map((variant, vIdx) => (
                    <div key={vIdx} className="rounded-md p-4 space-y-3 border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Màu</Label>
                          <Input
                            placeholder="Nhập màu"
                            value={variant.color}
                            onChange={(e) =>
                              handleVariantChange(vIdx, "color", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>URL ảnh</Label>
                          <Input
                            placeholder="Nhập URL ảnh"
                            value={variant.imageUrl}
                            onChange={(e) =>
                              handleVariantChange(vIdx, "imageUrl", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {variant.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end"
                          >
                            <div className="space-y-2">
                              <Label>Dung lượng bộ nhớ</Label>
                              <Select
                                value={opt.capacity || ""}
                                onValueChange={(value) =>
                                  handleVariantOptionChange(
                                    vIdx,
                                    oIdx,
                                    "capacity",
                                    value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn dung lượng" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    "128GB",
                                    "256GB",
                                    "512GB",
                                    "1TB",
                                    "2TB",
                                  ].map((capacity) => (
                                    <SelectItem key={capacity} value={capacity}>
                                      {capacity}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Giá gốc</Label>
                              <Input
                                type="number"
                                placeholder="Nhập giá gốc"
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
                            </div>
                            <div className="space-y-2">
                              <Label>Giá bán</Label>
                              <Input
                                type="number"
                                placeholder="Nhập giá bán"
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
                            </div>
                            <div className="space-y-2">
                              <Label>Số lượng</Label>
                              <Input
                                type="number"
                                placeholder="Nhập số lượng"
                                value={opt.quantity}
                                onChange={(e) =>
                                  handleVariantOptionChange(
                                    vIdx,
                                    oIdx,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addVariantOption(vIdx)}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Thêm dung lượng
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeVariant(vIdx)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Xóa biến thể
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label>Hình ảnh</Label>
                    <div className="flex flex-col gap-2">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={img}
                            onChange={(e) =>
                              handleArrayChange("images", idx, e.target.value)
                            }
                            placeholder="URL hình ảnh"
                            className={idx === 0 ? "font-bold" : ""}
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem("images")}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Thêm ảnh
                      </Button>
                    </div>
                    {formData.images.some((img) => img.trim()) && (
                      <div className="mt-4">
                        <Label>Ảnh xem trước</Label>
                        <div className="aspect-square bg-gray-200 mt-2">
                          {previewImage && (
                            <img
                              src={previewImage}
                              alt="Preview"
                              className="w-full h-full object-contain"
                            />
                          )}
                          {!previewImage && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          {formData.images
                            .filter((img) => img.trim())
                            .map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setPreviewImage(img)}
                                className="aspect-square bg-gray-100 border-2 rounded overflow-hidden"
                              >
                                <img
                                  src={img}
                                  alt={`Thumbnail ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          {formData.variants
                            .filter((v) => v.imageUrl && v.imageUrl.trim())
                            .map((v, idx) => (
                              <button
                                key={`variant-${idx}`}
                                onClick={() => setPreviewImage(v.imageUrl)}
                                className="aspect-square bg-gray-100 border-2 rounded overflow-hidden"
                              >
                                <img
                                  src={v.imageUrl}
                                  alt={`Variant Thumbnail ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
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

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
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
                <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid - Using ProductCard Component */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onUpdate={handleProductUpdate}
          />
        ))}
      </div>

      {/* Pagination */}
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