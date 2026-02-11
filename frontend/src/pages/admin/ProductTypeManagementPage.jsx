// ============================================
// FILE: frontend/src/pages/admin/ProductTypeManagementPage.jsx
// ✅ Quản lý loại sản phẩm với specs động
// ============================================

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Package, Settings } from "lucide-react";
import { productTypeAPI } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Loading } from "@/components/shared/Loading";

const ProductTypeManagementPage = () => {
  const { user } = useAuthStore();
  const [productTypes, setProductTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentProductType, setCurrentProductType] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    specFields: [],
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchProductTypes();
  }, [searchQuery]);

  const fetchProductTypes = async () => {
    setIsLoading(true);
    try {
      const response = await productTypeAPI.getAll({ search: searchQuery });
      console.log("✅ Product types loaded:", response.data.data.productTypes.length);
      setProductTypes(response.data.data.productTypes || []);
    } catch (error) {
      console.error("❌ Fetch product types error:", error);
      toast.error("Lỗi tải danh sách loại sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentMode("create");
    setCurrentProductType(null);
    setFormData({
      name: "",
      description: "",
      icon: "",
      specFields: [
        {
          key: "colors",
          label: "Màu sắc",
          type: "text",
          required: false,
          options: [],
          placeholder: "VD: Black, White",
        },
      ],
      status: "ACTIVE",
    });
    setShowModal(true);
  };

  const handleEdit = (productType) => {
    setCurrentMode("edit");
    setCurrentProductType(productType);
    setFormData({
      name: productType.name || "",
      description: productType.description || "",
      icon: productType.icon || "",
      specFields: productType.specFields || [],
      status: productType.status || "ACTIVE",
    });
    setShowModal(true);
  };

  const handleDelete = async (productTypeId) => {
    if (!confirm("Bạn có chắc muốn xóa loại sản phẩm này?")) return;

    try {
      await productTypeAPI.delete(productTypeId);
      toast.success("Xóa loại sản phẩm thành công");
      fetchProductTypes();
    } catch (error) {
      console.error("❌ Delete product type error:", error);
      toast.error(error.response?.data?.message || "Xóa loại sản phẩm thất bại");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("Tên loại sản phẩm là bắt buộc");
      return;
    }

    const payload = {
      ...formData,
      createdBy: user._id,
    };

    console.log("📤 Submitting product type:", payload);

    try {
      if (currentMode === "create") {
        await productTypeAPI.create(payload);
        toast.success("Tạo loại sản phẩm thành công");
      } else {
        await productTypeAPI.update(currentProductType._id, payload);
        toast.success("Cập nhật loại sản phẩm thành công");
      }
      setShowModal(false);
      fetchProductTypes();
    } catch (error) {
      console.error("❌ Submit product type error:", error);
      toast.error(error.response?.data?.message || "Lưu loại sản phẩm thất bại");
    }
  };

  // SPEC FIELD HANDLERS
  const addSpecField = () => {
    setFormData({
      ...formData,
      specFields: [
        ...formData.specFields,
        {
          key: "",
          label: "",
          type: "text",
          required: false,
          options: [],
          placeholder: "",
        },
      ],
    });
  };

  const removeSpecField = (index) => {
    setFormData({
      ...formData,
      specFields: formData.specFields.filter((_, i) => i !== index),
    });
  };

  const updateSpecField = (index, field, value) => {
    const updated = [...formData.specFields];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, specFields: updated });
  };

  const updateSpecOptions = (index, optionsString) => {
    const updated = [...formData.specFields];
    updated[index].options = optionsString
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setFormData({ ...formData, specFields: updated });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý loại sản phẩm</h1>
          <p className="text-muted-foreground">
            Định nghĩa loại sản phẩm và thông số kỹ thuật
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Thêm loại sản phẩm
        </Button>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm loại sản phẩm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* PRODUCT TYPES LIST */}
      {isLoading ? (
        <Loading />
      ) : productTypes.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "Không tìm thấy loại sản phẩm" : "Chưa có loại sản phẩm nào"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productTypes.map((type) => (
            <div
              key={type._id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {type.icon ? (
                    <img
                      src={type.icon}
                      alt={type.name}
                      className="w-12 h-12 object-contain rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <Settings className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{type.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        type.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {type.status === "ACTIVE" ? "Hoạt động" : "Không hoạt động"}
                    </span>
                  </div>
                </div>
              </div>

              {type.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {type.description}
                </p>
              )}

              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Thông số kỹ thuật ({type.specFields?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1">
                  {type.specFields?.slice(0, 3).map((field, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                    >
                      {field.label}
                    </span>
                  ))}
                  {type.specFields?.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{type.specFields.length - 3} khác
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(type)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" /> Sửa
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(type._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentMode === "create"
                ? "Thêm loại sản phẩm mới"
                : "Cập nhật loại sản phẩm"}
            </DialogTitle>
            <DialogDescription>
              Định nghĩa loại sản phẩm và các trường thông số kỹ thuật
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* BASIC INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Tên loại sản phẩm <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VD: Smartphone, Laptop, TV..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>URL Icon</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="https://example.com/icon.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Mô tả ngắn về loại sản phẩm..."
              />
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SPEC FIELDS */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Thông số kỹ thuật
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addSpecField}>
                  <Plus className="w-4 h-4 mr-2" /> Thêm trường
                </Button>
              </div>

              {formData.specFields.map((field, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 border rounded-lg bg-gray-50"
                >
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Key (code)</Label>
                    <Input
                      value={field.key}
                      onChange={(e) =>
                        updateSpecField(index, "key", e.target.value)
                      }
                      placeholder="VD: screenSize"
                      className="text-sm"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Label (hiển thị)</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateSpecField(index, "label", e.target.value)
                      }
                      placeholder="VD: Kích thước màn hình"
                      className="text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs">Kiểu</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) =>
                        updateSpecField(index, "type", value)
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      value={field.placeholder}
                      onChange={(e) =>
                        updateSpecField(index, "placeholder", e.target.value)
                      }
                      placeholder="VD: 6.7 inch"
                      className="text-sm"
                    />
                  </div>

                  <div className="md:col-span-1 flex items-center justify-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateSpecField(index, "required", e.target.checked)
                        }
                      />
                      Bắt buộc
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSpecField(index)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {field.type === "select" && (
                    <div className="md:col-span-12 space-y-2">
                      <Label className="text-xs">
                        Options (phân cách bằng dấu phẩy)
                      </Label>
                      <Input
                        value={field.options.join(", ")}
                        onChange={(e) =>
                          updateSpecOptions(index, e.target.value)
                        }
                        placeholder="VD: 128GB, 256GB, 512GB"
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                {currentMode === "create" ? "Tạo mới" : "Cập nhật"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductTypeManagementPage;
