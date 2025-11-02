// src/pages/admin/PromotionsPage.jsx
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
import { formatDate } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// === THÊM REACT-DATEPICKER + LOCALE VIỆT NAM ===
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { vi } from "date-fns/locale";
import { registerLocale } from "react-datepicker";

// Đăng ký locale Việt Nam
registerLocale("vi", vi);

/**
 * TRANG QUẢN LÝ KHUYẾN MÃI
 * - Tạo, sửa, xóa mã giảm giá
 * - Phân loại: Đang hoạt động / Sắp diễn ra / Đã hết hạn
 * - NHẬP NGÀY THEO KIỂU VIỆT NAM: dd/MM/yyyy (100% chính xác)
 */
const PromotionsPage = () => {
  // === STATE QUẢN LÝ DỮ LIỆU ===
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    startDate: "",
    endDate: "",
    usageLimit: "",
    minOrderValue: "",
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingPromotion, setDeletingPromotion] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // === LẤY DANH SÁCH KHUYẾN MÃI ===
  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const res = await promotionAPI.getAll();
      const promotionsData = res.data?.data?.promotions || [];
      setPromotions(promotionsData);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách khuyến mãi:", error);
      setError(
        error.response?.data?.message || "Lấy danh sách khuyến mãi thất bại"
      );
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // === XỬ LÝ THAY ĐỔI INPUT ===
  const handleChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  // === XỬ LÝ GỬI FORM ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(formData.endDate);
      endDate.setHours(23, 59, 59, 999);

      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        discountValue: Number(formData.discountValue),
        usageLimit: Number(formData.usageLimit),
        minOrderValue: Number(formData.minOrderValue) || 0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      if (editingId) {
        await promotionAPI.update(editingId, payload);
      } else {
        await promotionAPI.create(payload);
      }

      await fetchPromotions();
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || "Thao tác thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  // === CHỈNH SỬA ===
  const handleEdit = (promotion) => {
    const start = new Date(promotion.startDate).toISOString().split("T")[0];
    const end = new Date(promotion.endDate).toISOString().split("T")[0];

    setFormData({
      name: promotion.name,
      code: promotion.code,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue.toString(),
      startDate: start,
      endDate: end,
      usageLimit: promotion.usageLimit.toString(),
      minOrderValue: promotion.minOrderValue.toString(),
    });
    setEditingId(promotion._id);
    setShowForm(true);
  };

  // === RESET FORM ===
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      startDate: "",
      endDate: "",
      usageLimit: "",
      minOrderValue: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  // === XÓA ===
  const openDeleteDialog = (id, promotion) => {
    setDeletingId(id);
    setDeletingPromotion(promotion);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await promotionAPI.delete(deletingId);
      await fetchPromotions();
      setShowDeleteDialog(false);
      setDeletingId(null);
      setDeletingPromotion(null);
    } catch (error) {
      setError(error.response?.data?.message || "Xóa thất bại");
    }
  };

  // === TRẠNG THÁI ===
  const getPromotionStatus = (p) => {
    const now = new Date();
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (now < start) return "UPCOMING";
    if (now > end || p.usedCount >= p.usageLimit) return "EXPIRED";
    return "ACTIVE";
  };

  const getStatusText = (status) =>
    ({
      ACTIVE: "Đang hoạt động",
      EXPIRED: "Đã hết hạn",
      UPCOMING: "Sắp diễn ra",
    }[status]);

  const getStatusColor = (status) =>
    ({
      ACTIVE: "bg-green-100 text-green-800",
      EXPIRED: "bg-red-100 text-red-800",
      UPCOMING: "bg-blue-100 text-blue-800",
    }[status]);

  const activePromotions = promotions.filter(
    (p) => getPromotionStatus(p) === "ACTIVE"
  );
  const expiredPromotions = promotions.filter(
    (p) => getPromotionStatus(p) === "EXPIRED"
  );
  const upcomingPromotions = promotions.filter(
    (p) => getPromotionStatus(p) === "UPCOMING"
  );

  // === GRID COMPONENT ===
  const PromotionGrid = ({ promotions, emptyMessage }) => {
    if (promotions.length === 0) {
      return (
        <p className="col-span-full text-center text-muted-foreground py-8">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((p) => {
          const status = getPromotionStatus(p);
          return (
            <Card key={p._id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <p className="text-sm text-primary font-mono">{p.code}</p>
                  </div>
                  <Badge className={getStatusColor(status)}>
                    {getStatusText(status)}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Giảm:</span>
                    <span className="font-semibold text-green-600">
                      {p.discountType === "PERCENTAGE"
                        ? `-${p.discountValue}%`
                        : `-${p.discountValue.toLocaleString()}₫`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Đơn tối thiểu:
                    </span>
                    <span>{p.minOrderValue.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lượt dùng:</span>
                    <span>
                      {p.usedCount} / {p.usageLimit}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>{formatDate(p.startDate)}</span>
                    <span>→ {formatDate(p.endDate)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(p)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(p._id, p)}
                    disabled={p.usedCount > 0}
                    title={p.usedCount > 0 ? "Không thể xóa mã đã dùng" : ""}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý khuyến mãi</h1>
          <p className="text-muted-foreground">Tạo và quản lý mã giảm giá</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" /> Hủy
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" /> Thêm mã mới
            </>
          )}
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* FORM – DÙNG REACT-DATEPICKER ĐỂ ĐẢM BẢO dd/MM/yyyy */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Chỉnh sửa mã" : "Tạo mã khuyến mãi"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tên khuyến mãi *</Label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label>Mã code *</Label>
                  <Input
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="SALE20"
                    required
                  />
                </div>

                <div>
                  <Label>Loại giảm giá</Label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="PERCENTAGE">Phần trăm (%)</option>
                    <option value="FIXED">Số tiền (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <Label>
                    Giá trị giảm{" "}
                    {formData.discountType === "PERCENTAGE" ? "(%)" : "(VNĐ)"}
                  </Label>
                  <Input
                    name="discountValue"
                    type="number"
                    min="1"
                    max={
                      formData.discountType === "PERCENTAGE" ? "100" : undefined
                    }
                    value={formData.discountValue}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* NGÀY BẮT ĐẦU – dd/MM/yyyy */}
                <div>
                  <Label> Ngày bắt đầu </Label>
                  <DatePicker
                    selected={
                      formData.startDate ? new Date(formData.startDate) : null
                    }
                    onChange={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: date ? date.toISOString().split("T")[0] : "",
                      }))
                    }
                    dateFormat="dd/MM/yyyy"
                    locale="vi"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholderText="dd/mm/yyyy"
                    required
                  />
                </div>

                {/* NGÀY KẾT THÚC */}
                <div>
                  <Label>Ngày kết thúc </Label>
                  <DatePicker
                    selected={
                      formData.endDate ? new Date(formData.endDate) : null
                    }
                    onChange={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: date ? date.toISOString().split("T")[0] : "",
                      }))
                    }
                    dateFormat="dd/MM/yyyy"
                    locale="vi"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholderText="dd/mm/yyyy"
                    required
                  />
                </div>

                <div>
                  <Label>Giới hạn lượt dùng *</Label>
                  <Input
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label>Đơn tối thiểu (VNĐ)</Label>
                  <Input
                    name="minOrderValue"
                    type="number"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Đang xử lý..."
                    : editingId
                    ? "Cập nhật"
                    : "Tạo mã"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TABS + DANH SÁCH */}
      <div className="mt-6">
        <div className="border-b border-border">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("active")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "active"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Đang hoạt động
              <span className="ml-2 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">
                {activePromotions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "upcoming"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Sắp diễn ra
              <span className="ml-2 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
                {upcomingPromotions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "expired"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Đã hết hạn
              <span className="ml-2 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
                {expiredPromotions.length}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === "active" && (
            <PromotionGrid
              promotions={activePromotions}
              emptyMessage="Không có mã nào đang hoạt động."
            />
          )}
          {activeTab === "upcoming" && (
            <PromotionGrid
              promotions={upcomingPromotions}
              emptyMessage="Không có mã nào sắp diễn ra."
            />
          )}
          {activeTab === "expired" && (
            <PromotionGrid
              promotions={expiredPromotions}
              emptyMessage="Không có mã nào đã hết hạn."
            />
          )}
        </div>
      </div>

      {/* XÓA */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa mã khuyến mãi</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa mã{" "}
              <strong>{deletingPromotion?.code}</strong> (
              <em>{deletingPromotion?.name}</em>) không? <br />
              <span className="text-red-600 font-medium">
                {deletingPromotion?.usedCount > 0
                  ? "Mã đã được sử dụng → Không thể xóa."
                  : "Hành động này không thể hoàn tác."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingPromotion?.usedCount > 0}
            >
              {deletingPromotion?.usedCount > 0
                ? "Không thể xóa"
                : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromotionsPage;
