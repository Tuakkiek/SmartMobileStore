import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { promotionAPI } from "@/lib/api";
import { fetchAllProducts, getStatusColor, getStatusText, formatDate } from "@/lib/utils";

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    startDate: "",
    endDate: "",
    applicableProducts: [],
    status: "ACTIVE",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promotionsRes, productsData] = await Promise.all([
        promotionAPI.getAll(),
        fetchAllProducts({ limit: 100 }), // Giảm limit để tránh lỗi
      ]);
      console.log("Promotions API response:", promotionsRes);
      console.log("Products data:", productsData);
      // Kiểm tra cấu trúc dữ liệu
      const promotionsData = Array.isArray(promotionsRes.data.data.promotions)
        ? promotionsRes.data.data.promotions
        : [];
      const productsArray = Array.isArray(productsData) ? productsData : [];
      setPromotions(promotionsData);
      setProducts(productsArray);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.response?.data?.message || "Lấy danh sách sản phẩm hoặc khuyến mãi thất bại");
      setPromotions([]);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setError("");
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleProductSelect = (productId) => {
    setFormData((prev) => {
      const isSelected = prev.applicableProducts.includes(productId);
      return {
        ...prev,
        applicableProducts: isSelected
          ? prev.applicableProducts.filter((id) => id !== productId)
          : [...prev.applicableProducts, productId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (editingId) {
        await promotionAPI.update(editingId, formData);
      } else {
        await promotionAPI.create(formData);
      }
      await fetchData();
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || "Thao tác thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (promotion) => {
    setFormData({
      name: promotion.name,
      description: promotion.description || "",
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      startDate: new Date(promotion.startDate).toISOString().slice(0, 16),
      endDate: new Date(promotion.endDate).toISOString().slice(0, 16),
      applicableProducts: promotion.applicableProducts.map((p) => p._id || p),
      status: promotion.status,
    });
    setEditingId(promotion._id);
    setShowForm(true);
  };

  const handleDelete = async (promotionId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khuyến mãi này?")) return;

    try {
      await promotionAPI.delete(promotionId);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Xóa khuyến mãi thất bại");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      startDate: "",
      endDate: "",
      applicableProducts: [],
      status: "ACTIVE",
    });
    setShowForm(false);
    setEditingId(null);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý khuyến mãi</h1>
          <p className="text-muted-foreground">
            Tạo và quản lý các chương trình khuyến mãi
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Hủy
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Thêm khuyến mãi
            </>
          )}
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Chỉnh sửa khuyến mãi" : "Thêm khuyến mãi mới"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorMessage message={error} />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên khuyến mãi *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountType">Loại giảm giá *</Label>
                  <select
                    id="discountType"
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="PERCENTAGE">Phần trăm (%)</option>
                    <option value="FIXED">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Giá trị giảm {formData.discountType === "PERCENTAGE" ? "(%)" : "(VNĐ)"} *
                  </Label>
                  <Input
                    id="discountValue"
                    name="discountValue"
                    type="number"
                    min="0"
                    max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                    value={formData.discountValue}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Trạng thái *</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tạm dừng</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Ngày kết thúc *</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <textarea
                  id="description"
                  name="description"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Sản phẩm áp dụng</Label>
                <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-2">
                  {products.length === 0 ? (
                    <p className="text-muted-foreground">Không có sản phẩm nào.</p>
                  ) : (
                    products.map((product) => (
                      <label
                        key={product._id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.applicableProducts.includes(product._id)}
                          onChange={() => handleProductSelect(product._id)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{product.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Đang xử lý..."
                    : editingId
                    ? "Cập nhật"
                    : "Tạo khuyến mãi"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promotions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {promotions.length === 0 ? (
          <p className="text-center text-muted-foreground">Không có khuyến mãi nào.</p>
        ) : (
          promotions.map((promotion) => (
            <Card key={promotion._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{promotion.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {promotion.description}
                    </p>
                    <Badge className={getStatusColor(promotion.status)}>
                      {getStatusText(promotion.status)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {promotion.discountType === "PERCENTAGE"
                        ? `-${promotion.discountValue}%`
                        : `-${promotion.discountValue.toLocaleString()}đ`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bắt đầu:</span>
                    <span>{formatDate(promotion.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kết thúc:</span>
                    <span>{formatDate(promotion.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sản phẩm áp dụng:</span>
                    <span>{promotion.applicableProducts?.length || 0} sản phẩm</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(promotion)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(promotion._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PromotionsPage;