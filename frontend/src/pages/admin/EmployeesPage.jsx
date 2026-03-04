import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { userAPI, storeAPI } from "@/lib/api";
import { getStatusText, getNameInitials } from "@/lib/utils";
import { provinces } from "@/province";
import { useAuthStore } from "@/store/authStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Users, X, Pencil, Lock, Unlock, Trash2, MapPin, AlertTriangle } from "lucide-react";

const EMPLOYEE_TABS = [
  { value: "ALL", label: "Tất cả" },
  { value: "ADMIN", label: "Quản trị" },
  { value: "WAREHOUSE_MANAGER", label: "QL kho" },
  { value: "PRODUCT_MANAGER", label: "QL sản phẩm" },
  { value: "ORDER_MANAGER", label: "QL đơn hàng" },
  { value: "SHIPPER", label: "Giao hàng" },
  { value: "POS_STAFF", label: "Nhân viên POS" },
  { value: "CASHIER", label: "Thu ngân" },
];

const STEPS = [
  { id: 1, label: "Thông tin cơ bản" },
  { id: 2, label: "Chi nhánh" },
  { id: 3, label: "Phân quyền" },
];

const BRANCH_ROLES = new Set([
  "ADMIN",
  "BRANCH_ADMIN",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "POS_STAFF",
  "CASHIER",
  "SHIPPER",
]);

const normalize = (value) => String(value || "").trim();
const unique = (items = []) => Array.from(new Set(items.map((item) => normalize(item)).filter(Boolean)));

const isGranularFeatureEnabled = (user) => {
  const enabled =
    String(import.meta.env.VITE_FEATURE_PERMISSION_USER_MANAGEMENT || "false").toLowerCase() ===
    "true";
  if (!enabled) return false;
  const pilotRaw = String(import.meta.env.VITE_FEATURE_PERMISSION_USER_MANAGEMENT_PILOT || "").trim();
  if (!pilotRaw) return true;
  const pilot = new Set(pilotRaw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  return pilot.has(normalize(user?._id).toLowerCase()) || pilot.has(normalize(user?.email).toLowerCase());
};

const emptyForm = () => ({
  fullName: "",
  phoneNumber: "",
  email: "",
  province: "",
  password: "",
  role: "SHIPPER",
  avatar: "",
  storeLocation: "",
});

const EmployeesPage = () => {
  const { user, authz } = useAuthStore();
  const [activeTab, setActiveTab] = useState("ALL");
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [provinceFilter, setProvinceFilter] = useState("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [templateKeys, setTemplateKeys] = useState([]);
  const [branchIds, setBranchIds] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const granularEnabled = useMemo(() => isGranularFeatureEnabled(user), [user]);
  const isGlobalAdmin = useMemo(
    () => Boolean(authz?.isGlobalAdmin || String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN"),
    [authz?.isGlobalAdmin, user?.role]
  );
  const roleNeedsBranch = BRANCH_ROLES.has(String(formData.role || "").toUpperCase());

  const catalogByKey = useMemo(() => {
    const map = new Map();
    for (const item of catalog) map.set(normalize(item.key), item);
    return map;
  }, [catalog]);

  const groupedCatalog = useMemo(() => {
    const grouped = {};
    for (const item of catalog) {
      const moduleKey = normalize(item.module) || "general";
      if (!grouped[moduleKey]) grouped[moduleKey] = [];
      grouped[moduleKey].push(item);
    }
    return grouped;
  }, [catalog]);

  const templateByKey = useMemo(() => {
    const map = new Map();
    for (const item of templates) map.set(normalize(item.key), item);
    return map;
  }, [templates]);

  const hasBranchScopedPermission = permissionKeys.some((key) => {
    const p = catalogByKey.get(normalize(key));
    return String(p?.scopeType || "").toUpperCase() === "BRANCH";
  });

  const sensitivePermissions = permissionKeys.filter((key) => catalogByKey.get(normalize(key))?.isSensitive);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((item) => {
        if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
        if (provinceFilter !== "ALL" && item.province !== provinceFilter) return false;
        return true;
      }),
    [employees, statusFilter, provinceFilter]
  );

  const branchStoreOptions = useMemo(() => {
    if (isGlobalAdmin) return stores;
    const allowed = unique(authz?.allowedBranchIds || []);
    if (!allowed.length) return stores;
    return stores.filter((store) => allowed.includes(normalize(store._id)));
  }, [stores, isGlobalAdmin, authz?.allowedBranchIds]);

  useEffect(() => {
    fetchEmployees(1);
    fetchStores();
  }, [activeTab, searchQuery, storeFilter]);

  useEffect(() => {
    if (granularEnabled) fetchMetadata();
  }, [granularEnabled]);

  useEffect(() => {
    if (!granularEnabled) return;
    if (step !== 3) return;
    if (!showCreateDialog && !editingEmployee) return;
    refreshPreview(editingEmployee?._id || "new-user-preview");
  }, [
    granularEnabled,
    step,
    showCreateDialog,
    editingEmployee?._id,
    permissionKeys.join("|"),
    branchIds.join("|"),
    templateKeys.join("|"),
  ]);

  const fetchStores = async () => {
    try {
      const res = await storeAPI.getAll({ limit: 200 });
      setStores(res.data.stores || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await userAPI.getAllEmployees({
        page,
        limit: 12,
        search: searchQuery || undefined,
        role: activeTab !== "ALL" ? activeTab : undefined,
        storeLocation: storeFilter !== "ALL" ? storeFilter : undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const data = res.data?.data || {};
      setEmployees(data.employees || []);
      setPagination({
        currentPage: data.pagination?.currentPage || 1,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0,
      });
    } catch (e) {
      setError("Không thể tải danh sách nhân viên");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await userAPI.getPermissionCatalog();
      setCatalog(res.data?.data?.catalog || []);
      setTemplates(res.data?.data?.templates || []);
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải metadata phân quyền");
    }
  };

  const applyTemplate = (templateKey) => {
    const normalizedKey = normalize(templateKey).toUpperCase();
    setTemplateKeys(normalizedKey ? [normalizedKey] : []);
    const template = templateByKey.get(normalizedKey);
    if (!template) {
      setPermissionKeys([]);
      return;
    }
    setPermissionKeys(unique((template.permissions || []).map((item) => item.key)));
  };

  const buildPermissionPayload = (targetUserId = "new-user-preview") => ({
    enableGranularPermissions: true,
    templateKeys,
    branchIds,
    targetUserId,
    permissions: permissionKeys
      .map((key) => {
        const item = catalogByKey.get(normalize(key));
        if (!item) return null;
        const scopeType = String(item.scopeType || "").toUpperCase();
        if (scopeType === "BRANCH") return { key: item.key, scopeType: "BRANCH", branchIds };
        if (scopeType === "SELF") return { key: item.key, scopeType: "SELF", scopeId: targetUserId };
        return { key: item.key, scopeType: "GLOBAL" };
      })
      .filter(Boolean),
  });

  const refreshPreview = async (targetUserId = "new-user-preview") => {
    if (!granularEnabled) return;
    try {
      setPreviewLoading(true);
      const res = await userAPI.previewPermissionAssignments({
        ...buildPermissionPayload(targetUserId),
        role: formData.role,
        storeLocation: branchIds[0] || formData.storeLocation,
      });
      setPreview(res.data?.data || null);
      if (res.data?.success === false) {
        setError(res.data?.message || "Xem trước phân quyền bị từ chối");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Không thể xem trước phân quyền");
    } finally {
      setPreviewLoading(false);
    }
  };

  const resetWizard = (role = "SHIPPER") => {
    setStep(1);
    setPreview(null);
    setBranchIds([]);
    setPermissionKeys([]);
    setTemplateKeys([]);
    if (granularEnabled && templateByKey.has(role)) applyTemplate(role);
  };

  const openCreateDialog = () => {
    const role = activeTab !== "ALL" ? activeTab : "SHIPPER";
    setFormData({ ...emptyForm(), role });
    resetWizard(role);
    setShowCreateDialog(true);
  };

  const openEditDialog = async (employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName || "",
      phoneNumber: employee.phoneNumber || "",
      email: employee.email || "",
      province: employee.province || "",
      password: "",
      role: employee.role || "SHIPPER",
      avatar: employee.avatar || "",
      storeLocation: employee.storeLocation || "",
    });
    setStep(1);
    setBranchIds(unique([employee.storeLocation]));
    setPermissionKeys([]);
    setTemplateKeys([]);
    setPreview(null);
    if (granularEnabled) {
      try {
        const res = await userAPI.getUserEffectivePermissions(employee._id);
        const data = res.data?.data || {};
        setPermissionKeys(unique((data.permissionGrants || []).map((item) => item.key)));
        setBranchIds(
          unique([
            ...(data.allowedBranchIds || []),
            ...(data.permissionGrants || [])
              .filter((item) => String(item.scopeType || "").toUpperCase() === "BRANCH")
              .map((item) => item.scopeId),
          ])
        );
      } catch (e) {
        setError(e.response?.data?.message || "Không thể tải quyền hiện tại");
      }
    }
  };

  const closeDialog = () => {
    setShowCreateDialog(false);
    setEditingEmployee(null);
    setFormData(emptyForm());
    setStep(1);
    setBranchIds([]);
    setPermissionKeys([]);
    setTemplateKeys([]);
    setPreview(null);
    setError("");
  };

  const basePayload = () => ({
    fullName: formData.fullName,
    phoneNumber: formData.phoneNumber,
    email: formData.email,
    province: formData.province,
    password: formData.password,
    role: formData.role,
    avatar: formData.avatar,
    storeLocation: branchIds[0] || formData.storeLocation,
    branchIds,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const payload = basePayload();
      if (granularEnabled) {
        Object.assign(payload, buildPermissionPayload("new-user-preview"));
        await userAPI.createUser(payload);
      } else {
        await userAPI.createEmployee(payload);
      }
      await fetchEmployees();
      closeDialog();
    } catch (e) {
      setError(e.response?.data?.message || "Tạo nhân viên thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setIsSubmitting(true);
    setError("");
    try {
      const payload = basePayload();
      if (!normalize(payload.password)) delete payload.password;
      await userAPI.updateEmployee(editingEmployee._id, payload);
      if (granularEnabled) {
        await userAPI.updateUserPermissions(editingEmployee._id, buildPermissionPayload(editingEmployee._id));
      }
      await fetchEmployees();
      closeDialog();
    } catch (e) {
      setError(e.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await userAPI.toggleEmployeeStatus(id);
      await fetchEmployees();
    } catch {
      setError("Thao tác thất bại");
    }
  };

  const removeEmployee = async (id) => {
    if (!window.confirm("Xóa nhân viên này?")) return;
    try {
      await userAPI.deleteEmployee(id);
      await fetchEmployees();
    } catch {
      setError("Xóa thất bại");
    }
  };

  const renderWizard = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              step === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setStep(item.id)}
          >
            {item.id}. {item.label}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Họ và tên *</Label><Input name="fullName" value={formData.fullName} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} required /></div>
          <div><Label>Số điện thoại *</Label><Input name="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))} required /></div>
          <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} /></div>
          <div><Label>Tỉnh/Thành</Label><Select value={formData.province} onValueChange={(value) => setFormData((prev) => ({ ...prev, province: value }))}><SelectTrigger><SelectValue placeholder="Chọn tỉnh/thành" /></SelectTrigger><SelectContent className="max-h-96">{provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Mật khẩu {editingEmployee ? "(mới)" : "*"}</Label><Input type="password" value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} required={!editingEmployee} /></div>
          <div><Label>Vai trò *</Label><Select value={formData.role} onValueChange={(value) => { setFormData((prev) => ({ ...prev, role: value })); if (granularEnabled && templateByKey.has(value)) applyTemplate(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EMPLOYEE_TABS.filter((t) => t.value !== "ALL").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2"><Label>Ảnh đại diện (URL)</Label><Input value={formData.avatar} onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))} /></div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Phạm vi chi nhánh</div>
          {branchStoreOptions.map((store) => (
            <label key={store._id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <Checkbox checked={branchIds.includes(normalize(store._id))} onCheckedChange={(checked) => setBranchIds((prev) => checked ? unique([...prev, store._id]) : prev.filter((id) => normalize(id) !== normalize(store._id)))} />
              <span>{store.name} ({store.code})</span>
            </label>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          {granularEnabled ? (
            <>
              <div className="rounded border p-3">
                <Label className="mb-2 block">Chọn mẫu phân quyền</Label>
                <Select value={templateKeys[0] || ""} onValueChange={(value) => applyTemplate(value)}>
                  <SelectTrigger><SelectValue placeholder="Chọn mẫu" /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t._id || t.key} value={t.key}>{t.name || t.key}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded border p-3">
                {Object.entries(groupedCatalog).map(([moduleKey, modulePermissions]) => (
                  <div key={moduleKey} className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{moduleKey}</div>
                    {modulePermissions.map((item) => (
                      <label key={item._id || item.key} className="flex items-start justify-between gap-2 rounded border p-2 text-sm">
                        <span className="flex items-start gap-2">
                          <Checkbox checked={permissionKeys.includes(normalize(item.key))} onCheckedChange={(checked) => setPermissionKeys((prev) => checked ? unique([...prev, item.key]) : prev.filter((k) => normalize(k) !== normalize(item.key)))} />
                          <span>
                            <span className="block font-medium">{item.key}</span>
                            <span className="text-xs text-muted-foreground">{item.description || `${item.module}.${item.action}`}</span>
                          </span>
                        </span>
                        <span className="flex gap-1">
                          <Badge variant="outline" className="text-[10px]">{item.scopeType}</Badge>
                          {item.isSensitive ? <Badge variant="destructive" className="text-[10px]">Nhạy cảm</Badge> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded border p-3 text-sm">
                <span>Đã chọn: {permissionKeys.length}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => refreshPreview(editingEmployee?._id || "new-user-preview")}>{previewLoading ? "Đang tải bản xem trước..." : "Tải lại bản xem trước"}</Button>
              </div>
              {sensitivePermissions.length ? (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle className="h-4 w-4" /> Quyền nhạy cảm</div>
                  <div>{sensitivePermissions.join(", ")}</div>
                </div>
              ) : null}
              {preview ? <div className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">Quyền hiệu lực: {preview.assignments?.length || 0}</div> : null}
            </>
          ) : (
            <div className="rounded border p-3 text-sm text-muted-foreground">Tính năng phân quyền chi tiết đã bị vô hiệu hóa.</div>
          )}
        </div>
      ) : null}
    </div>
  );

  const hasFilter = searchQuery || statusFilter !== "ALL" || provinceFilter !== "ALL" || storeFilter !== "ALL";
  const canContinue =
    step === 1
      ? normalize(formData.fullName) && normalize(formData.phoneNumber) && (editingEmployee || normalize(formData.password))
      : step === 2
        ? !(roleNeedsBranch || hasBranchScopedPermission) || branchIds.length > 0
        : true;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Quản lý nhân viên</h1><Button onClick={openCreateDialog}><UserPlus className="mr-2 h-4 w-4" />Thêm nhân viên</Button></div>
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setSearchQuery(""); setStatusFilter("ALL"); setProvinceFilter("ALL"); setStoreFilter("ALL"); }}><TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-9">{EMPLOYEE_TABS.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}</TabsList></Tabs>
      <div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm tên, email, số điện thoại..." /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả</SelectItem><SelectItem value="ACTIVE">ACTIVE</SelectItem><SelectItem value="LOCKED">LOCKED</SelectItem></SelectContent></Select><Select value={provinceFilter} onValueChange={setProvinceFilter}><SelectTrigger className="w-56"><SelectValue placeholder="Tỉnh/Thành" /></SelectTrigger><SelectContent className="max-h-96"><SelectItem value="ALL">Tất cả tỉnh/thành</SelectItem>{provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>{isGlobalAdmin ? <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className="w-56"><SelectValue placeholder="Chi nhánh" /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả chi nhánh</SelectItem>{stores.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent></Select> : null}{hasFilter ? <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setProvinceFilter("ALL"); setStoreFilter("ALL"); }}><X className="mr-2 h-4 w-4" />Xóa bộ lọc</Button> : null}</div>
      {error ? <ErrorMessage message={error} /> : null}
      {isLoading ? <Loading /> : filteredEmployees.length === 0 ? <div className="py-16 text-center"><Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" /><p className="text-muted-foreground">{hasFilter ? "Không tìm thấy nhân viên" : "Chưa có nhân viên nào"}</p></div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredEmployees.map((emp) => <Card key={emp._id}><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><Avatar className="h-12 w-12">{emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.fullName} /> : <AvatarFallback>{getNameInitials(emp.fullName)}</AvatarFallback>}</Avatar><Badge className={emp.status === "ACTIVE" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}>{getStatusText(emp.status)}</Badge></div><h3 className="font-semibold">{emp.fullName}</h3><p className="text-sm text-muted-foreground">{emp.phoneNumber}</p>{emp.email ? <p className="text-xs text-muted-foreground">{emp.email}</p> : null}{emp.storeLocation ? <Badge variant="secondary" className="mt-2 text-xs"><MapPin className="mr-1 h-3 w-3" />{stores.find((s) => normalize(s._id) === normalize(emp.storeLocation))?.name || "Chi nhánh"}</Badge> : null}<div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => openEditDialog(emp)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="outline" onClick={() => toggleStatus(emp._id)}>{emp.status === "ACTIVE" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</Button><Button size="sm" variant="outline" onClick={() => removeEmployee(emp._id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></CardContent></Card>)}</div>}
      {pagination.totalPages > 1 ? <div className="mt-8 flex items-center justify-center gap-6"><Button variant="outline" size="sm" disabled={pagination.currentPage === 1} onClick={() => fetchEmployees(pagination.currentPage - 1)}>Trước</Button><span className="text-sm">Trang {pagination.currentPage}/{pagination.totalPages}</span><Button variant="outline" size="sm" disabled={pagination.currentPage === pagination.totalPages} onClick={() => fetchEmployees(pagination.currentPage + 1)}>Sau</Button></div> : null}

      <Dialog open={showCreateDialog} onOpenChange={(open) => (open ? setShowCreateDialog(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Thêm nhân viên mới</DialogTitle></DialogHeader><form onSubmit={handleCreate} className="space-y-4">{renderWizard()}<DialogFooter><Button type="button" variant="outline" onClick={closeDialog}>Hủy</Button>{step > 1 ? <Button type="button" variant="outline" onClick={() => setStep((prev) => prev - 1)}>Quay lại</Button> : null}{step < 3 ? <Button type="button" disabled={!canContinue} onClick={() => setStep((prev) => prev + 1)}>Tiếp tục</Button> : <Button type="submit" disabled={isSubmitting || ((roleNeedsBranch || hasBranchScopedPermission) && branchIds.length === 0)}>{isSubmitting ? "Đang tạo..." : "Tạo nhân viên"}</Button>}</DialogFooter></form></DialogContent>
      </Dialog>

      {editingEmployee ? (
        <Dialog open={Boolean(editingEmployee)} onOpenChange={(open) => (!open ? closeDialog() : null)}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Chỉnh sửa nhân viên</DialogTitle></DialogHeader><form onSubmit={handleUpdate} className="space-y-4">{renderWizard()}<DialogFooter><Button type="button" variant="outline" onClick={closeDialog}>Hủy</Button>{step > 1 ? <Button type="button" variant="outline" onClick={() => setStep((prev) => prev - 1)}>Quay lại</Button> : null}{step < 3 ? <Button type="button" disabled={!canContinue} onClick={() => setStep((prev) => prev + 1)}>Tiếp tục</Button> : <Button type="submit" disabled={isSubmitting || ((roleNeedsBranch || hasBranchScopedPermission) && branchIds.length === 0)}>{isSubmitting ? "Đang cập nhật..." : "Cập nhật"}</Button>}</DialogFooter></form></DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};

export default EmployeesPage;
