// src/pages/admin/PromotionsPage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Plus, Edit, Trash2, X, Search, Copy, Calendar } from "lucide-react";
import { promotionAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

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
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 12,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPromotion, setDeletingPromotion] = useState(null);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all");
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    active: 0,
    upcoming: 0,
    expired: 0,
  });

  // Helper date
  const formatDateLocal = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateLocal = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split("-");
    return new Date(year, month - 1, day);
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  // FETCH DATA
  const fetchPromotions = useCallback(
    async (page = 1, query = searchQuery, tab = activeTab) => {
      if (page === 1 && !isInitialLoading) {
        setIsTableLoading(true);
      }

      try {
        const statusParam =
          tab === "all"
            ? undefined
            : tab === "active"
            ? "ACTIVE"
            : tab === "upcoming"
            ? "UPCOMING"
            : "EXPIRED";

        const res = await promotionAPI.getAllPromotions({
          page,
          limit: 12,
          search: query?.trim() || undefined,
          status: statusParam,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        const { promotions: promoList = [], pagination: pag = {} } =
          res.data.data || {};

        setPromotions(promoList);
        setPagination({
          currentPage: pag.currentPage || 1,
          totalPages: pag.totalPages || 1,
          total: pag.total || 0,
          limit: pag.limit || 12,
        });
      } catch (err) {
        setError("Không thể tải danh sách mã khuyến mãi");
        toast.error("Lỗi tải dữ liệu");
      } finally {
        setIsInitialLoading(false);
        setIsTableLoading(false);
      }
    },
    [searchQuery, activeTab, isInitialLoading] // thêm realTabCounts.all vào dependency
  );
  // Thêm hàm này vào component
  const fetchTabCounts = useCallback(async () => {
    try {
      // Gọi 4 lần song song → nhanh như chớp
      const [allRes, activeRes, upcomingRes, expiredRes] = await Promise.all([
        promotionAPI.getAllPromotions({ page: 1, limit: 1 }),
        promotionAPI.getAllPromotions({ page: 1, limit: 1, status: "ACTIVE" }),
        promotionAPI.getAllPromotions({
          page: 1,
          limit: 1,
          status: "UPCOMING",
        }),
        promotionAPI.getAllPromotions({ page: 1, limit: 1, status: "EXPIRED" }),
      ]);

      const getTotal = (res) => res.data.data?.pagination?.total || 0;

      setTabCounts({
        all: getTotal(allRes),
        active: getTotal(activeRes),
        upcoming: getTotal(upcomingRes),
        expired: getTotal(expiredRes),
      });
    } catch (err) {
      console.error("Lỗi load tab counts", err);
    }
  }, []);

  // 1. Load lần đầu
  useEffect(() => {
    fetchPromotions(1);
    fetchTabCounts(); // ← GỌI Ở ĐÂY, chỉ 1 lần
  }, []);
  // 2. Khi đổi tab hoặc search → gọi lại (trừ lần đầu)
  useEffect(() => {
    if (!isInitialLoading) {
      fetchPromotions(1);
    }
  }, [activeTab, searchQuery]);
  // Copy mã
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy: ${code}`);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount:
          formData.discountType === "PERCENTAGE" && formData.maxDiscountAmount
            ? Number(formData.maxDiscountAmount)
            : null,
        startDate: new Date(formData.startDate + "T00:00:00").toISOString(),
        endDate: new Date(formData.endDate + "T23:59:59.999").toISOString(),
        usageLimit: Number(formData.usageLimit),
        minOrderValue: Number(formData.minOrderValue) || 0,
      };

      if (editingId) {
        await promotionAPI.update(editingId, payload);
        toast.success("Cập nhật thành công!");
      } else {
        await promotionAPI.create(payload);
        toast.success("Tạo mã khuyến mãi thành công!");
      }

      resetForm();
      fetchPromotions(pagination.currentPage);
      fetchTabCounts();
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
      maxDiscountAmount: p.maxDiscountAmount
        ? p.maxDiscountAmount.toString()
        : "",
      startDate: formatDateLocal(p.startDate),
      endDate: formatDateLocal(p.endDate),
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

  const openDeleteDialog = (p) => {
    setDeletingPromotion(p);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await promotionAPI.delete(deletingPromotion._id);
      toast.success("Xóa thành công!");
      fetchPromotions(pagination.currentPage);
      fetchTabCounts();
      setShowDeleteDialog(false);
    } catch (err) {
      toast.error("Không thể xóa mã đã sử dụng");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "UPCOMING":
        return "bg-blue-100 text-blue-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isInitialLoading) return <Loading />;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý khuyến mãi</h1>
          <p className="text-muted-foreground">Tạo và quản lý mã giảm giá</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              {" "}
              <X className="w-4 h-4 mr-2" /> Hủy{" "}
            </>
          ) : (
            <>
              {" "}
              <Plus className="w-4 h-4 mr-2" /> Thêm mã mới{" "}
            </>
          )}
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* TABS + SEARCH */}
      <div className="space-y-6">
        {/* TABS */}
        <div className="flex gap-3 flex-wrap border-b border-border pb-3">
          {[
            {
              key: "all",
              label: "Tất cả",
              count: tabCounts.all,
              color: "bg-gray-100 text-gray-700",
            },
            {
              key: "active",
              label: "Đang hoạt động",
              count: tabCounts.active,
              color: "bg-emerald-100 text-emerald-700",
            },
            {
              key: "upcoming",
              label: "Sắp diễn ra",
              count: tabCounts.upcoming,
              color: "bg-blue-100 text-blue-700",
            },
            {
              key: "expired",
              label: "Đã hết hạn",
              count: tabCounts.expired,
              color: "bg-red-100 text-red-700",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const [bg, text] = tab.color.split(" ");

            return (
              <Button
                key={tab.key}
                variant="outline"
                size="sm"
                className={`
                  relative font-medium transition-all duration-200 border-2
                  ${
                    isActive
                      ? `${bg} ${text} border-transparent shadow-md font-semibold scale-105`
                      : `${bg} ${text} border-transparent opacity-70 hover:opacity-100 hover:scale-105`
                  }
                `}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchQuery("");
                  fetchPromotions(1, undefined, tab.key);
                }}
              >
                {tab.label}
                <Badge
                  className={`
                    ml-2 text-xs font-bold px-2
                    ${
                      isActive
                        ? "bg-white text-inherit shadow"
                        : "bg-white/80 text-inherit"
                    }
                  `}
                >
                  {tab.count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* THANH TÌM KIẾM SIÊU MƯỢT – KHÔNG MẤT FOCUS, CÓ SPINNER, CÓ NÚT XÓA TRONG INPUT */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            {/* Icon kính lúp */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

            {/* Input tìm kiếm */}
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm tên hoặc mã khuyến mãi..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);

                // Clear timeout cũ
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current);
                }

                // Tạo timeout mới (debounce 400ms)
                searchTimeoutRef.current = setTimeout(() => {
                  fetchPromotions(1, value.trim() || undefined, activeTab);
                  // Giữ focus sau khi search xong → gõ liên tục cực mượt
                  searchInputRef.current?.focus();
                }, 400);
              }}
              onKeyDown={(e) => {
                // Enter = tìm ngay
                if (e.key === "Enter") {
                  if (searchTimeoutRef.current)
                    clearTimeout(searchTimeoutRef.current);
                  fetchPromotions(
                    1,
                    searchQuery.trim() || undefined,
                    activeTab
                  );
                  e.currentTarget.blur(); // optional: bỏ focus để nhìn đẹp hơn
                }
                // Escape = xóa tìm kiếm
                if (e.key === "Escape") {
                  setSearchQuery("");
                  fetchPromotions(1, undefined, activeTab);
                  searchInputRef.current?.focus();
                }
              }}
              className="pl-10 pr-10 h-10 text-sm"
              autoFocus={false}
            />

            {/* Nút X xóa nằm TRONG input (đẹp như app lớn) */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchPromotions(1, undefined, activeTab);
                  searchInputRef.current?.focus(); // giữ focus sau khi xóa
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Chỉnh sửa" : "Tạo mã khuyến mãi"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="w-full px-3 py-2 border rounded-md border"
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
                    max={
                      formData.discountType === "PERCENTAGE" ? 100 : undefined
                    }
                    required
                  />
                </div>

                {formData.discountType === "PERCENTAGE" && (
                  <div className="md:col-span-2">
                    <Label>
                      Giảm tối đa (VNĐ){" "}
                      <span className="text-muted-foreground text-xs">
                        (tùy chọn)
                      </span>
                    </Label>
                    <Input
                      type="number"
                      name="maxDiscountAmount"
                      value={formData.maxDiscountAmount}
                      onChange={handleChange}
                      placeholder="500000"
                    />
                  </div>
                )}

                <div>
                  <Label>Ngày bắt đầu *</Label>
                  <DatePicker
                    selected={
                      formData.startDate
                        ? parseDateLocal(formData.startDate)
                        : null
                    }
                    onChange={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: date ? formatDateLocal(date) : "",
                      }))
                    }
                    dateFormat="dd/MM/yyyy"
                    locale="vi"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholderText="Chọn ngày"
                    required
                  />
                </div>

                <div>
                  <Label>Ngày kết thúc *</Label>
                  <DatePicker
                    selected={
                      formData.endDate ? parseDateLocal(formData.endDate) : null
                    }
                    onChange={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: date ? formatDateLocal(date) : "",
                      }))
                    }
                    dateFormat="dd/MM/yyyy"
                    locale="vi"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholderText="Chọn ngày"
                    required
                  />
                </div>

                <div>
                  <Label>Giới hạn lượt dùng *</Label>
                  <Input
                    type="number"
                    name="usageLimit"
                    value={formData.usageLimit}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label>Đơn tối thiểu (VNĐ)</Label>
                  <Input
                    type="number"
                    name="minOrderValue"
                    value={formData.minOrderValue}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Đang xử lý..."
                    : editingId
                    ? "Cập nhật"
                    : "Tạo mới"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* LIST + PROGRESS BAR */}
      {promotions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {searchQuery || activeTab !== "all"
            ? "Không tìm thấy mã khuyến mãi nào"
            : "Chưa có mã khuyến mãi nào"}
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map((p) => (
              <Card
                key={p._id}
                className="hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg h-14 flex items-center line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <code className="text-primary font-mono text-lg">
                          {p.code}
                        </code>
                      </div>
                    </div>
                    <Badge
                      className={`${getStatusColor(
                        p._status
                      )} whitespace-nowrap shrink-0`}
                    >
                      {p._status === "ACTIVE" && "Đang hoạt động"}
                      {p._status === "UPCOMING" && "Sắp diễn ra"}
                      {p._status === "EXPIRED" && "Đã hết hạn"}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Giảm:</span>
                      <span className="font-bold text-green-600 text-lg">
                        {p.displayText}
                      </span>
                    </div>

                    {p.minOrderValue > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Đơn tối thiểu:</span>
                        <span>{p.minOrderValue.toLocaleString()}₫</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Lượt dùng</span>
                        <span className="font-medium">
                          {p.usedCount} / {p.usageLimit}
                          {p.usagePercent !== undefined && (
                            <span className="text-muted-foreground ml-1">
                              ({p.usagePercent}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            p.usagePercent >= 100
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${p.usagePercent || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(p.startDate)} → {formatDate(p.endDate)}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5">
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
                      onClick={() => openDeleteDialog(p)}
                      disabled={p.usedCount > 0}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Xóa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PHÂN TRANG */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-6 mt-10">
              <Button
                variant="outline"
                disabled={pagination.currentPage === 1}
                onClick={() => fetchPromotions(pagination.currentPage - 1)}
              >
                Trang trước
              </Button>

              <span className="text-sm font-medium">
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => fetchPromotions(pagination.currentPage + 1)}
              >
                Trang sau
              </Button>
            </div>
          )}
        </>
      )}

      {/* DELETE DIALOG */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa mã <strong>{deletingPromotion?.code}</strong> -{" "}
              {deletingPromotion?.name}
              <br />
              {deletingPromotion?.usedCount > 0 ? (
                <span className="text-red-600">
                  Mã đã được sử dụng → Không thể xóa
                </span>
              ) : (
                <span>Hành động này không thể hoàn tác.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletingPromotion?.usedCount > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromotionsPage;
