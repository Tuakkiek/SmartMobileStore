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

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { vi } from "date-fns/locale";
import { registerLocale } from "react-datepicker";
registerLocale("vi", vi);

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Thêm trường maxDiscountAmount
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    maxDiscountAmount: "",   // ← mới
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

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const res = await promotionAPI.getAll();
      setPromotions(res.data?.data?.promotions || []);
    } catch (err) {
      setError("Không thể tải danh sách mã giảm giá");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

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
        name: formData.name.trim(),
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        // Chỉ gửi maxDiscountAmount khi là phần trăm và có giá trị
        maxDiscountAmount:
          formData.discountType === "PERCENTAGE" && formData.maxDiscountAmount
            ? Number(formData.maxDiscountAmount)
            : null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        usageLimit: Number(formData.usageLimit),
        minOrderValue: Number(formData.minOrderValue) || 0,
      };

      if (editingId) {
        await promotionAPI.update(editingId, payload);
      } else {
        await promotionAPI.create(payload);
      }

      await fetchPromotions();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || "Thao tác thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (p) => {
    setFormData({
      name: p.name || "",
      code: p.code || "",
      discountType: p.discountType || "PERCENTAGE",
      discountValue: p.discountValue?.toString() || "",
      maxDiscountAmount: p.maxDiscountAmount ? p.maxDiscountAmount.toString() : "",
      startDate: new Date(p.startDate).toISOString().split("T")[0],
      endDate: new Date(p.endDate).toISOString().split("T")[0],
      usageLimit: p.usageLimit?.toString() || "",
      minOrderValue: p.minOrderValue?.toString() || "",
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      maxDiscountAmount: "",
      startDate: "",
      endDate: "",
      usageLimit: "",
      minOrderValue: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openDeleteDialog = ( promotion) => {
    setDeletingId(promotion._id);
    setDeletingPromotion(promotion);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await promotionAPI.delete(deletingId);
      await fetchPromotions();
      setShowDeleteDialog(false);
    } catch (err) {
      setError("Không thể xóa mã đã được sử dụng");
    }
  };

  // Trạng thái hiển thị
  const getPromotionStatus = (p) => {
    const now = new Date();
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (now < start) return "UPCOMING";
    if (now > end || p.usedCount >= p.usageLimit) return "EXPIRED";
    return "ACTIVE";
  };

  const getStatusText = (s) => ({ ACTIVE: "Đang hoạt động", EXPIRED: "Đã hết hạn", UPCOMING: "Sắp diễn ra" }[s]);
  const getStatusColor = (s) => ({ ACTIVE: "bg-green-100 text-green-800", EXPIRED: "bg-red-100 text-red-800", UPCOMING: "bg-blue-100 text-blue-800" }[s]);

  const activePromotions = promotions.filter(p => getPromotionStatus(p) === "ACTIVE");
  const upcomingPromotions = promotions.filter(p => getPromotionStatus(p) === "UPCOMING");
  const expiredPromotions = promotions.filter(p => getPromotionStatus(p) === "EXPIRED");

  // Hiển thị giảm giá trong card
  const getDiscountDisplay = (p) => {
    if (p.discountType === "FIXED") return `-${p.discountValue.toLocaleString()}₫`;
    if (p.maxDiscountAmount) return `-${p.discountValue}% (tối đa ${p.maxDiscountAmount.toLocaleString()}₫)`;
    return `-${p.discountValue}%`;
  };

  const PromotionGrid = ({ promotions, emptyMessage }) => {
    if (promotions.length === 0) {
      return <p className="col-span-full text-center text-muted-foreground py-8">{emptyMessage}</p>;
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
                  <Badge className={getStatusColor(status)}>{getStatusText(status)}</Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Giảm:</span>
                    <span className="font-semibold text-green-600">{getDiscountDisplay(p)}</span>
                  </div>
                  {p.minOrderValue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Đơn tối thiểu:</span>
                      <span>{p.minOrderValue.toLocaleString()}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lượt dùng:</span>
                    <span>{p.usedCount} / {p.usageLimit}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>{formatDate(p.startDate)}</span>
                    <span>→ {formatDate(p.endDate)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                    <Edit className="w-4 h-4 mr-1" /> Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(p)}
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
            <> <X className="w-4 h-4 mr-2" /> Hủy</>
          ) : (
            <> <Plus className="w-4 h-4 mr-2" /> Thêm mã mới</>
          )}
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* FORM */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Chỉnh sửa mã" : "Tạo mã khuyến mãi"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tên khuyến mãi *</Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                  <Label>Mã code *</Label>
                  <Input name="code" value={formData.code} onChange={handleChange} placeholder="SALE20" required />
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
                  <Label>Giá trị giảm *</Label>
                  <Input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleChange}
                    min="1"
                    max={formData.discountType === "PERCENTAGE" ? 100 : undefined}
                    required
                  />
                </div>

                {/* Ô INPUT GIẢM TỐI ĐA – CHỈ HIỆN KHI LÀ % */}
                {formData.discountType === "PERCENTAGE" && (
                  <div className="md:col-span-2">
                    <Label>
                      Giảm tối đa (VNĐ) <span className="text-xs text-muted-foreground">(không bắt buộc)</span>
                    </Label>
                    <Input
                      type="number"
                      name="maxDiscountAmount"
                      value={formData.maxDiscountAmount}
                      onChange={handleChange}
                      placeholder="500000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ví dụ: Giảm 30% nhưng tối đa chỉ giảm 300.000₫
                    </p>
                  </div>
                )}

                <div>
                  <Label>Ngày bắt đầu *</Label>
                  <DatePicker
                    selected={formData.startDate ? new Date(formData.startDate) : null}
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

                <div>
                  <Label>Ngày kết thúc *</Label>
                  <DatePicker
                    selected={formData.endDate ? new Date(formData.endDate) : null}
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
                  <Input type="number" name="usageLimit" value={formData.usageLimit} onChange={handleChange} min="1" required />
                </div>

                <div>
                  <Label>Đơn tối thiểu (VNĐ)</Label>
                  <Input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleChange} placeholder="0" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : editingId ? "Cập nhật" : "Tạo mã"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TABS */}
      <div className="mt-6">
        <div className="border-b border-border">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("active")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Đang hoạt động
              <span className="ml-2 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">{activePromotions.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "upcoming" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Sắp diễn ra
              <span className="ml-2 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">{upcomingPromotions.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "expired" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Đã hết hạn
              <span className="ml-2 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">{expiredPromotions.length}</span>
            </button>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === "active" && (
            <PromotionGrid promotions={activePromotions} emptyMessage="Không có mã nào đang hoạt động." />
          )}
          {activeTab === "upcoming" && (
            <PromotionGrid promotions={upcomingPromotions} emptyMessage="Không có mã nào sắp diễn ra." />
          )}
          {activeTab === "expired" && (
            <PromotionGrid promotions={expiredPromotions} emptyMessage="Không có mã nào đã hết hạn." />
          )}
        </div>
      </div>

      {/* XÓA DIALOG */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa mã khuyến mãi</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa mã <strong>{deletingPromotion?.code}</strong> (
              <em>{deletingPromotion?.name}</em>) không?<br />
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
              {deletingPromotion?.usedCount > 0 ? "Không thể xóa" : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromotionsPage;