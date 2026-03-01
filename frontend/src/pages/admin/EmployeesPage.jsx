import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  UserPlus,
  Search,
  Users,
  X,
  Pencil,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import { userAPI, storeAPI } from "@/lib/api";
import { getStatusText, getNameInitials } from "@/lib/utils";
import { provinces } from "@/province";
import { MapPin } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore"; // ✅ Import auth store
// ... imports

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPLOYEE_TABS = [
  { value: "ALL", label: "Tất cả nhân viên" },
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "WAREHOUSE_MANAGER", label: "Quản lý kho" },
  { value: "PRODUCT_MANAGER", label: "Quản lý sản phẩm" },
  { value: "ORDER_MANAGER", label: "Quản lý đơn hàng" },
  { value: "SHIPPER", label: "Shipper" },
  { value: "POS_STAFF", label: "Nhân viên bán hàng" },
  { value: "CASHIER", label: "Thu ngân" },
];

const EmployeesPage = () => {
  const [activeTab, setActiveTab] = useState("ALL");
  const [allEmployees, setAllEmployees] = useState([]);
  const [stores, setStores] = useState([]); // ✅ Added stores state
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore(); // ✅ Get current user

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [provinceFilter, setProvinceFilter] = useState("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL"); // ✅ Store filter state

  // Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    province: "",
    password: "",
    role: "SHIPPER",
    avatar: "",
    storeLocation: "", // ✅ Added storeLocation
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  useEffect(() => {
    fetchEmployees(1);
    fetchStores(); // ✅ Fetch stores on mount
  }, [activeTab, searchQuery, storeFilter]); // ✅ Trigger on storeFilter change

  const fetchStores = async () => {
      try {
          const res = await storeAPI.getAll({ limit: 100 });
          setStores(res.data.stores || []);
      } catch (err) {
          console.error("Failed to fetch stores", err);
      }
  };

  const fetchEmployees = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = {
        page,
        limit: 12,
        search: searchQuery.trim() || undefined,
        role: activeTab !== "ALL" ? activeTab : undefined,
        storeLocation: storeFilter !== "ALL" ? storeFilter : undefined, // ✅ Pass store filter
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      const res = await userAPI.getAllEmployees(params);

      const { employees = [], pagination: pag = {} } = res.data.data;

      setAllEmployees(employees);
      setPagination({
        currentPage: pag.currentPage || 1,
        totalPages: pag.totalPages || 1,
        total: pag.total || 0,
      });
    } catch (err) {
      setError("Không thể tải danh sách nhân viên");
    } finally {
      setIsLoading(false);
    }
  };

  const displayedEmployees = allEmployees;

  const handleTabChange = (val) => {
    setActiveTab(val);
    setSearchQuery("");
    setStatusFilter("ALL");
    setProvinceFilter("ALL");
    setStoreFilter("ALL"); // ✅ Reset store filter
  };

  const handleChange = (e) => {
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  // Hàm xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    if (
      newPage >= 1 &&
      newPage <= pagination.totalPages &&
      newPage !== pagination.currentPage
    ) {
      fetchEmployees(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleProvinceChange = (value) => {
    setFormData((prev) => ({ ...prev, province: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const openCreateDialog = () => {
    const role = activeTab !== "ALL" ? activeTab : "SHIPPER";
    setFormData({
      ...formData,
      role,
      province: "",
      password: "",
      fullName: "",
      phoneNumber: "",
      email: "",
      avatar: "",
      storeLocation: "",
    });
    setShowCreateDialog(true);
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName || "",
      phoneNumber: emp.phoneNumber || "",
      email: emp.email || "",
      province: emp.province || "",
      password: "",
      role: emp.role,
      avatar: emp.avatar || "",
      storeLocation: emp.storeLocation || "",
    });
  };

  const closeDialog = () => {
    setShowCreateDialog(false);
    setEditingEmployee(null);
    setFormData({
      fullName: "",
      phoneNumber: "",
      email: "",
      province: "",
      password: "",
      role: "SHIPPER",
      avatar: "",
      storeLocation: "",
    });
    setError("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await userAPI.createEmployee(formData);
      await fetchEmployees();
      setShowCreateDialog(false);
      closeDialog();
    } catch (err) {
      setError(err.response?.data?.message || "Tạo nhân viên thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.password?.trim()) delete payload.password;
      await userAPI.updateEmployee(editingEmployee._id, payload);
      await fetchEmployees();
      setEditingEmployee(null);
      closeDialog();
    } catch (err) {
      setError(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await userAPI.toggleEmployeeStatus(id);
      await fetchEmployees();
    } catch (err) {
      alert("Thao tác thất bại");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa nhân viên này? Không thể hoàn tác!")) return;
    try {
      await userAPI.deleteEmployee(id);
      await fetchEmployees();
    } catch (err) {
      alert("Xóa thất bại");
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setProvinceFilter("ALL");
    setStoreFilter("ALL"); // ✅ Reset store filter
  };

  const hasFilter =
    searchQuery || statusFilter !== "ALL" || provinceFilter !== "ALL" || storeFilter !== "ALL";

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý nhân viên</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <UserPlus className="w-4 h-4 mr-2" />
          Thêm nhân viên
        </Button>
      </div>

      {/* TABS + FILTER + LIST + DIALOGS - GIỮ NGUYÊN NHƯ BÊN DƯỚI */}
      {/* (Mình giữ nguyên phần JSX của bạn vì nó đã đúng 100%) */}

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-9 w-full">
          {EMPLOYEE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs md:text-sm"
            >
              {tab.value === "ALL"}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm tên, số điện thoại, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
            <SelectItem value="LOCKED">Đã khóa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={provinceFilter} onValueChange={setProvinceFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tỉnh/Thành phố" />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            <SelectItem value="ALL">Tất cả tỉnh/thành</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ✅ Store Filter for Global Admin */}
        {user?.role === "GLOBAL_ADMIN" && (
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả chi nhánh</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilter && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <X className="w-4 h-4 mr-2" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* DANH SÁCH NHÂN VIÊN */}
      {isLoading ? (
        <Loading />
      ) : displayedEmployees.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">
            {hasFilter
              ? "Không tìm thấy nhân viên nào"
              : "Chưa có nhân viên nào"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedEmployees.map((emp) => (
            <Card key={emp._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <Avatar className="w-12 h-12">
                    {emp.avatar ? (
                      <AvatarImage src={emp.avatar} alt={emp.fullName} />
                    ) : (
                      <AvatarFallback className="bg-primary/10">
                        {getNameInitials(emp.fullName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Badge
                    className={`
                        ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        } 
                        font-medium
                      `}
                  >
                    {getStatusText(emp.status)}
                  </Badge>
                </div>

                <h3 className="font-semibold text-lg">{emp.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  {emp.phoneNumber}
                </p>
                {emp.email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {emp.email}
                  </p>
                )}
                {emp.province && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {emp.province}
                  </Badge>
                )}
                
                {/* Store Location Badge */}
                {emp.storeLocation && (
                    <Badge variant="secondary" className="mt-2 ml-2 text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {stores.find(s => s._id === emp.storeLocation)?.name || "Chi nhánh khác"}
                    </Badge>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(emp)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(emp._id)}
                  >
                    {emp.status === "ACTIVE" ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(emp._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* PHÂN TRANG ĐẸP - GIỐNG CASHIER */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-8 mt-12">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === 1 || isLoading}
            onClick={() => handlePageChange(pagination.currentPage - 1)}
          >
            Trước
          </Button>

          <div className="text-sm font-medium min-w-[140px] text-center">
            Trang {pagination.currentPage} / {pagination.totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={
              pagination.currentPage === pagination.totalPages || isLoading
            }
            onClick={() => handlePageChange(pagination.currentPage + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      {/* DIALOG TẠO & SỬA - giữ nguyên, chỉ thêm handleRoleChange */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm nhân viên mới</DialogTitle>
            {/* Visually hidden description for accessibility */}
            <div className="sr-only" aria-describedby="dialog-description">
              Điền thông tin để tạo nhân viên mới
            </div>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <ErrorMessage message={error} />}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Họ và tên *</Label>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label>Số điện thoại *</Label>
                <Input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label>Tỉnh/Thành phố</Label>
                <Select
                  value={formData.province}
                  onValueChange={handleProvinceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tỉnh/thành phố" />
                  </SelectTrigger>
                  <SelectContent className="max-h-96">
                    {provinces.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mật khẩu *</Label>
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label>Vai trò *</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_TABS.slice(1).map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

               {/* BRANCH SELECTION */}
               <div>
                  <Label>Chi nhánh / Cửa hàng</Label>
                   <Select
                    value={formData.storeLocation}
                    onValueChange={(val) => setFormData(prev => ({...prev, storeLocation: val}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store._id} value={store._id}>
                          {store.name} ({store.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              <div className="col-span-2">
                <Label>URL ảnh đại diện</Label>
                <Input
                  name="avatar"
                  type="url"
                  value={formData.avatar}
                  onChange={handleChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo..." : "Tạo nhân viên"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {editingEmployee && (
        <Dialog
          open={!!editingEmployee}
          onOpenChange={() => setEditingEmployee(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa nhân viên</DialogTitle>
               {/* Visually hidden description for accessibility */}
              <div className="sr-only" aria-describedby="dialog-description">
                Cập nhật thông tin nhân viên
              </div>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && <ErrorMessage message={error} />}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Họ và tên *</Label>
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label>Số điện thoại *</Label>
                  <Input
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label>Tỉnh/Thành phố</Label>
                  <Select
                    value={formData.province}
                    onValueChange={handleProvinceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tỉnh/thành phố" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mật khẩu mới (để trống nếu không đổi)</Label>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label>Vai trò *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_TABS.slice(1).map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* BRANCH SELECTION */}
                <div>
                  <Label>Chi nhánh / Cửa hàng</Label>
                   <Select
                    value={formData.storeLocation}
                    onValueChange={(val) => setFormData(prev => ({...prev, storeLocation: val}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store._id} value={store._id}>
                          {store.name} ({store.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>URL ảnh đại diện</Label>
                  <Input
                    name="avatar"
                    type="url"
                    value={formData.avatar}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Cập nhật
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EmployeesPage;
