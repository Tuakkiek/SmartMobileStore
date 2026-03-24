import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Loading } from "@/shared/ui/Loading";
import { ErrorMessage } from "@/shared/ui/ErrorMessage";
import { userAPI } from "@/features/account";
import { storeAPI } from "@/features/stores";
import { getStatusText, getNameInitials } from "@/shared/lib/utils";
import { provinces } from "@/shared/constants/provinces";
import { useAuthStore } from "@/features/auth";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  UserPlus,
  Search,
  Users,
  X,
  Pencil,
  Lock,
  Unlock,
  Trash2,
  MapPin,
  AlertTriangle,
} from "lucide-react";

const EMPLOYEE_TABS = [
  { value: "ALL", label: "Táº¥t cáº£" },
  { value: "ADMIN", label: "Quáº£n trá»‹" },
  { value: "WAREHOUSE_MANAGER", label: "QL kho" },
  { value: "PRODUCT_MANAGER", label: "QL sáº£n pháº©m" },
  { value: "ORDER_MANAGER", label: "QL Ä‘Æ¡n hÃ ng" },
  { value: "SHIPPER", label: "Giao hÃ ng" },
  { value: "POS_STAFF", label: "NhÃ¢n viÃªn POS" },
  { value: "CASHIER", label: "Thu ngÃ¢n" },
];

const STEPS = [
  { id: 1, label: "ThÃ´ng tin cÆ¡ báº£n" },
  { id: 2, label: "Chi nhÃ¡nh" },
  { id: 3, label: "PhÃ¢n quyá»n" },
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

const SCOPE_LABELS = {
  GLOBAL: "ToÃ n cá»¥c",
  BRANCH: "Chi nhÃ¡nh",
  SELF: "Báº£n thÃ¢n",
};

const translateModule = (moduleKey) => {
  if (!moduleKey) return "";
  const map = {
    analytics: "Thá»‘ng kÃª",
    auth: "XÃ¡c thá»±c",
    branch: "Chi nhÃ¡nh",
    category: "Danh má»¥c",
    customer: "KhÃ¡ch hÃ ng",
    dashboard: "Báº£ng Ä‘iá»u khiá»ƒn",
    employee: "NhÃ¢n viÃªn",
    inventory: "Kho hÃ ng",
    order: "ÄÆ¡n hÃ ng",
    product: "Sáº£n pháº©m",
    report: "BÃ¡o cÃ¡o",
    role: "Vai trÃ²",
    setting: "CÃ i Ä‘áº·t",
    store: "Cá»­a hÃ ng",
    user: "NgÆ°á»i dÃ¹ng",
    general: "Chung",
  };
  const lowerKey = String(moduleKey).toLowerCase();
  return map[lowerKey] || moduleKey;
};

const translateDescription = (desc, key) => {
  const customMap = {
    "analytics.read.assigned": "Xem thá»‘ng kÃª cÃ¡c chi nhÃ¡nh Ä‘Æ°á»£c giao",
    "analytics.read.branch": "Xem thá»‘ng kÃª chi nhÃ¡nh Ä‘ang hoáº¡t Ä‘á»™ng",
    "analytics.read.global": "Xem thá»‘ng kÃª trÃªn toÃ n há»‡ thá»‘ng",
    "analytics.read.personal": "Xem thá»‘ng kÃª cÃ¡ nhÃ¢n",
  };
  if (customMap[key]) return customMap[key];
  if (!desc) return "";
  
  let translated = desc;
  
  // Replace action words
  translated = translated.replace(/^Read /gi, 'Xem ');
  translated = translated.replace(/^Create /gi, 'Táº¡o ');
  translated = translated.replace(/^Update /gi, 'Cáº­p nháº­t ');
  translated = translated.replace(/^Delete /gi, 'XÃ³a ');
  translated = translated.replace(/^Manage /gi, 'Quáº£n lÃ½ ');
  translated = translated.replace(/^View /gi, 'Xem ');
  
  // Replace common objects
  translated = translated.replace(/ analytics/gi, ' thá»‘ng kÃª');
  translated = translated.replace(/ users/gi, ' ngÆ°á»i dÃ¹ng');
  translated = translated.replace(/ user/gi, ' ngÆ°á»i dÃ¹ng');
  translated = translated.replace(/ orders/gi, ' Ä‘Æ¡n hÃ ng');
  translated = translated.replace(/ order/gi, ' Ä‘Æ¡n hÃ ng');
  translated = translated.replace(/ products/gi, ' sáº£n pháº©m');
  translated = translated.replace(/ product/gi, ' sáº£n pháº©m');
  translated = translated.replace(/ categories/gi, ' danh má»¥c');
  translated = translated.replace(/ category/gi, ' danh má»¥c');
  translated = translated.replace(/ customers/gi, ' khÃ¡ch hÃ ng');
  translated = translated.replace(/ customer/gi, ' khÃ¡ch hÃ ng');
  translated = translated.replace(/ inventory/gi, ' kho hÃ ng');
  translated = translated.replace(/ settings/gi, ' cÃ i Ä‘áº·t');
  translated = translated.replace(/ setting/gi, ' cÃ i Ä‘áº·t');
  translated = translated.replace(/ roles/gi, ' vai trÃ²');
  translated = translated.replace(/ role/gi, ' vai trÃ²');
  translated = translated.replace(/ permissions/gi, ' quyá»n');
  translated = translated.replace(/ permission/gi, ' quyá»n');
  
  // Conditions
  translated = translated.replace(/ for assigned branches/gi, ' cÃ¡c chi nhÃ¡nh Ä‘Æ°á»£c giao');
  translated = translated.replace(/ for assigned branch/gi, ' chi nhÃ¡nh Ä‘Æ°á»£c giao');
  translated = translated.replace(/ for active branch/gi, ' chi nhÃ¡nh Ä‘ang hoáº¡t Ä‘á»™ng');
  translated = translated.replace(/ across all branches/gi, ' trÃªn toÃ n há»‡ thá»‘ng');
  translated = translated.replace(/ personal/gi, ' cÃ¡ nhÃ¢n');
  translated = translated.replace(/ own/gi, ' cÃ¡ nhÃ¢n');
  translated = translated.replace(/ all/gi, ' táº¥t cáº£');
  translated = translated.replace(/ for /gi, ' cho ');

  return translated.charAt(0).toUpperCase() + translated.slice(1);
};

const normalize = (value) => String(value || "").trim();
const normalizeStoreId = (value) => normalize(value?._id || value);
const unique = (items = []) =>
  Array.from(new Set(items.map((item) => normalize(item)).filter(Boolean)));

const isGranularFeatureEnabled = (user) => {
  const enabled =
    String(
      import.meta.env.VITE_FEATURE_PERMISSION_USER_MANAGEMENT || "false",
    ).toLowerCase() === "true";
  if (!enabled) return false;
  const pilotRaw = String(
    import.meta.env.VITE_FEATURE_PERMISSION_USER_MANAGEMENT_PILOT || "",
  ).trim();
  if (!pilotRaw) return true;
  const pilot = new Set(
    pilotRaw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  return (
    pilot.has(normalize(user?._id).toLowerCase()) ||
    pilot.has(normalize(user?.email).toLowerCase())
  );
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
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });
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
  const [primaryBranchId, setPrimaryBranchId] = useState("");

  const granularEnabled = useMemo(() => isGranularFeatureEnabled(user), [user]);
  const isGlobalAdmin = useMemo(
    () =>
      Boolean(
        authz?.isGlobalAdmin ||
        String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN",
      ),
    [authz?.isGlobalAdmin, user?.role],
  );
  const roleNeedsBranch = BRANCH_ROLES.has(
    String(formData.role || "").toUpperCase(),
  );

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

  const storeById = useMemo(() => {
    const map = new Map();
    for (const store of stores) {
      map.set(normalize(store._id), store);
    }
    return map;
  }, [stores]);

  const templateByKey = useMemo(() => {
    const map = new Map();
    for (const item of templates) {
      map.set(normalize(item.key).toUpperCase(), item);
    }
    return map;
  }, [templates]);

  const permissionKeySet = useMemo(
    () => new Set(permissionKeys.map((key) => normalize(key))),
    [permissionKeys],
  );

  const hasBranchScopedPermission = permissionKeys.some((key) => {
    const p = catalogByKey.get(normalize(key));
    return String(p?.scopeType || "").toUpperCase() === "BRANCH";
  });

  const sensitivePermissions = permissionKeys.filter(
    (key) => catalogByKey.get(normalize(key))?.isSensitive,
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((item) => {
        if (statusFilter !== "ALL" && item.status !== statusFilter)
          return false;
        if (provinceFilter !== "ALL" && item.province !== provinceFilter)
          return false;
        return true;
      }),
    [employees, statusFilter, provinceFilter],
  );

  const branchStoreOptions = useMemo(() => {
    if (isGlobalAdmin) return stores;
    const allowed = unique(authz?.allowedBranchIds || []);
    if (!allowed.length) return stores;
    return stores.filter((store) => allowed.includes(normalize(store._id)));
  }, [stores, isGlobalAdmin, authz?.allowedBranchIds]);

  const sortedBranchIds = useMemo(() => {
    if (!branchIds.length) return [];
    const primary = normalize(primaryBranchId);
    if (primary) {
      return [primary, ...branchIds.filter((id) => normalize(id) !== primary)];
    }
    return branchIds;
  }, [branchIds, primaryBranchId]);

  useEffect(() => {
    if (!branchIds.length) {
      setPrimaryBranchId("");
      return;
    }
    const primary = normalize(primaryBranchId);
    if (primary && branchIds.some((id) => normalize(id) === primary)) return;
    setPrimaryBranchId(normalize(branchIds[0]));
  }, [branchIds.join("|")]);

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

  const deriveDefaultBranchIds = () => {
    if (isGlobalAdmin) return [];
    const preferred =
      normalize(authz?.activeBranchId) ||
      normalize(user?.storeLocation);
    const allowed = unique(authz?.allowedBranchIds || []);

    if (preferred && (!allowed.length || allowed.includes(preferred))) {
      return [preferred];
    }
    if (allowed.length === 1) return [allowed[0]];
    return [];
  };

  const extractBranchIdsFromEmployee = (employee) => {
    const assignments = Array.isArray(employee?.branchAssignments)
      ? employee.branchAssignments
      : [];
    const activeAssignments = assignments.filter(
      (item) => String(item?.status || "ACTIVE").toUpperCase() === "ACTIVE",
    );
    const orderedAssignments = [...activeAssignments].sort((a, b) =>
      b?.isPrimary === true ? 1 : a?.isPrimary === true ? -1 : 0,
    );
    const assignmentIds = orderedAssignments
      .map((assignment) => normalizeStoreId(assignment?.storeId))
      .filter(Boolean);
    if (assignmentIds.length) return unique(assignmentIds);
    const legacyStore = normalizeStoreId(employee?.storeLocation);
    return legacyStore ? [legacyStore] : [];
  };

  const extractPrimaryBranchId = (employee, branchList = []) => {
    const assignments = Array.isArray(employee?.branchAssignments)
      ? employee.branchAssignments
      : [];
    const primaryAssignment = assignments.find((item) => item?.isPrimary);
    const primary = normalizeStoreId(primaryAssignment?.storeId);
    if (primary) return primary;
    const legacyStore = normalizeStoreId(employee?.storeLocation);
    if (legacyStore) return legacyStore;
    return branchList[0] ? normalize(branchList[0]) : "";
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
      setError("KhÃ´ng thá»ƒ táº£i danh sÃ¡ch nhÃ¢n viÃªn");
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
      setError(
        e.response?.data?.message || "KhÃ´ng thá»ƒ táº£i metadata phÃ¢n quyá»n",
      );
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
    setPermissionKeys(
      unique((template.permissions || []).map((item) => item.key)),
    );
  };

  const togglePermission = (permissionKey, checked) => {
    setTemplateKeys([]);
    setPermissionKeys((prev) =>
      checked
        ? unique([...prev, permissionKey])
        : prev.filter((key) => normalize(key) !== normalize(permissionKey)),
    );
  };

  const toggleModulePermissions = (modulePermissions = [], checked) => {
    const moduleKeys = unique(modulePermissions.map((item) => item.key));
    const moduleKeySet = new Set(moduleKeys.map((key) => normalize(key)));
    setTemplateKeys([]);
    setPermissionKeys((prev) =>
      checked
        ? unique([...prev, ...moduleKeys])
        : prev.filter((key) => !moduleKeySet.has(normalize(key))),
    );
  };

  const buildPermissionPayload = (targetUserId = "new-user-preview") => ({
    enableGranularPermissions: true,
    templateKeys,
    branchIds: sortedBranchIds,
    targetUserId,
    permissions: permissionKeys
      .map((key) => {
        const item = catalogByKey.get(normalize(key));
        if (!item) return null;
        const scopeType = String(item.scopeType || "").toUpperCase();
        if (scopeType === "BRANCH")
          return { key: item.key, scopeType: "BRANCH", branchIds: sortedBranchIds };
        if (scopeType === "SELF")
          return { key: item.key, scopeType: "SELF" };
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
        storeLocation: sortedBranchIds[0] || formData.storeLocation,
      });
      setPreview(res.data?.data || null);
      if (res.data?.success === false) {
        setError(res.data?.message || "Xem trÆ°á»›c phÃ¢n quyá»n bá»‹ tá»« chá»‘i");
      }
    } catch (e) {
      setError(e.response?.data?.message || "KhÃ´ng thá»ƒ xem trÆ°á»›c phÃ¢n quyá»n");
    } finally {
      setPreviewLoading(false);
    }
  };

  const resetWizard = (role = "SHIPPER") => {
    const defaults = deriveDefaultBranchIds();
    setStep(1);
    setPreview(null);
    setBranchIds(defaults);
    setPrimaryBranchId(defaults[0] || "");
    setPermissionKeys([]);
    setTemplateKeys([]);
    if (granularEnabled && templateByKey.has(normalize(role).toUpperCase())) {
      applyTemplate(role);
    }
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
    const nextBranchIds = extractBranchIdsFromEmployee(employee);
    setBranchIds(nextBranchIds);
    setPrimaryBranchId(extractPrimaryBranchId(employee, nextBranchIds));
    setPermissionKeys([]);
    setTemplateKeys([]);
    setPreview(null);
    if (granularEnabled) {
      try {
        const res = await userAPI.getUserEffectivePermissions(employee._id);
        const data = res.data?.data || {};
        setPermissionKeys(
          unique((data.permissionGrants || []).map((item) => item.key)),
        );
        setBranchIds(
          unique([
            ...(data.allowedBranchIds || []),
            ...(data.permissionGrants || [])
              .filter(
                (item) =>
                  String(item.scopeType || "").toUpperCase() === "BRANCH",
              )
              .map((item) => item.scopeId),
          ]),
        );
      } catch (e) {
        setError(e.response?.data?.message || "KhÃ´ng thá»ƒ táº£i quyá»n hiá»‡n táº¡i");
      }
    }
  };

  const closeDialog = () => {
    setShowCreateDialog(false);
    setEditingEmployee(null);
    setFormData(emptyForm());
    setStep(1);
    setBranchIds([]);
    setPrimaryBranchId("");
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
    storeLocation: sortedBranchIds[0] || formData.storeLocation,
    branchIds: sortedBranchIds,
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
      setError(e.response?.data?.message || "Táº¡o nhÃ¢n viÃªn tháº¥t báº¡i");
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
        await userAPI.updateUserPermissions(
          editingEmployee._id,
          buildPermissionPayload(editingEmployee._id),
        );
      }
      await fetchEmployees();
      closeDialog();
    } catch (e) {
      setError(e.response?.data?.message || "Cáº­p nháº­t tháº¥t báº¡i");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await userAPI.toggleEmployeeStatus(id);
      await fetchEmployees();
    } catch {
      setError("Thao tÃ¡c tháº¥t báº¡i");
    }
  };

  const removeEmployee = async (id) => {
    if (!window.confirm("XÃ³a nhÃ¢n viÃªn nÃ y?")) return;
    try {
      await userAPI.deleteEmployee(id);
      await fetchEmployees();
    } catch {
      setError("XÃ³a tháº¥t báº¡i");
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
              step === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setStep(item.id)}
          >
            {item.id}. {item.label}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Há» vÃ  tÃªn *</Label>
            <Input
              name="fullName"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <Label>Sá»‘ Ä‘iá»‡n thoáº¡i *</Label>
            <Input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  phoneNumber: e.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Tá»‰nh/ThÃ nh</Label>
            <Select
              value={formData.province}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, province: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chá»n tá»‰nh/thÃ nh" />
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
            <Label>Máº­t kháº©u {editingEmployee ? "(má»›i)" : "*"}</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              required={!editingEmployee}
            />
          </div>
          <div className="col-span-2">
            <Label>áº¢nh Ä‘áº¡i diá»‡n (URL)</Label>
            <Input
              value={formData.avatar}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, avatar: e.target.value }))
              }
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Pháº¡m vi chi nhÃ¡nh</div>
          {branchStoreOptions.length === 0 ? (
            <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
              KhÃ´ng cÃ³ chi nhÃ¡nh nÃ o trong pháº¡m vi quáº£n lÃ½.
            </div>
          ) : (
            branchStoreOptions.map((store) => (
              <label
                key={store._id}
                className="flex items-center gap-2 rounded border p-2 text-sm"
              >
                <Checkbox
                  checked={branchIds.includes(normalize(store._id))}
                  onCheckedChange={(checked) =>
                    setBranchIds((prev) =>
                      checked
                        ? unique([...prev, store._id])
                        : prev.filter(
                            (id) => normalize(id) !== normalize(store._id),
                          ),
                    )
                  }
                />
                <span>
                  {store.name} ({store.code})
                </span>
              </label>
            ))
          )}
          {(roleNeedsBranch || hasBranchScopedPermission) &&
          branchStoreOptions.length > 0 &&
          branchIds.length === 0 ? (
            <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              Vui lÃ²ng chá»n Ã­t nháº¥t 1 chi nhÃ¡nh Ä‘á»ƒ tiáº¿p tá»¥c.
            </div>
          ) : null}
          {branchIds.length > 1 ? (
            <div className="space-y-2 pt-2">
              <Label>Chi nhÃ¡nh chÃ­nh</Label>
              <Select
                value={normalize(primaryBranchId)}
                onValueChange={(value) => setPrimaryBranchId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chá»n chi nhÃ¡nh chÃ­nh" />
                </SelectTrigger>
                <SelectContent>
                  {sortedBranchIds.map((branchId) => {
                    const store = storeById.get(normalize(branchId));
                    const label = store
                      ? `${store.name} (${store.code})`
                      : branchId;
                    return (
                      <SelectItem key={branchId} value={branchId}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <div className="rounded border p-3">
            <Label className="mb-2 block">Vai trÃ²</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, role: value }));
                if (
                  granularEnabled &&
                  templateByKey.has(normalize(value).toUpperCase())
                ) {
                  applyTemplate(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chá»n vai trÃ²" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_TABS.filter((t) => t.value !== "ALL").map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {granularEnabled ? (
            <>
              <div className="rounded border p-3">
                <Label className="mb-2 block">Chá»n máº«u phÃ¢n quyá»n</Label>
                <Select
                  value={templateKeys[0] || "__NONE__"}
                  onValueChange={(value) => {
                    if (value === "__NONE__") {
                      setTemplateKeys([]);
                      return;
                    }
                    applyTemplate(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chá»n máº«u" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">
                      KhÃ´ng Ã¡p dá»¥ng máº«u
                    </SelectItem>
                    {templates.map((t) => (
                      <SelectItem
                        key={t._id || t.key}
                        value={normalize(t.key).toUpperCase()}
                      >
                        {t.name || t.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded border p-3">
                {catalog.length === 0 ? (
                  <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                    ChÆ°a cÃ³ danh má»¥c quyá»n Ä‘á»ƒ hiá»ƒn thá»‹.
                  </div>
                ) : null}
                {Object.entries(groupedCatalog).map(
                  ([moduleKey, modulePermissions]) => (
                    <div key={moduleKey} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">
                          {translateModule(moduleKey)} (
                          {
                            modulePermissions.filter((item) =>
                              permissionKeySet.has(normalize(item.key)),
                            ).length
                          }
                          /{modulePermissions.length})
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() =>
                              toggleModulePermissions(modulePermissions, true)
                            }
                          >
                            Chá»n háº¿t
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() =>
                              toggleModulePermissions(modulePermissions, false)
                            }
                          >
                            Bá» module
                          </Button>
                        </div>
                      </div>
                      {modulePermissions.map((item) => (
                        <label
                          key={item._id || item.key}
                          className="flex items-start justify-between gap-2 rounded border p-2 text-sm"
                        >
                          <span className="flex items-start gap-2">
                            <Checkbox
                              checked={permissionKeySet.has(normalize(item.key))}
                              onCheckedChange={(checked) =>
                                togglePermission(item.key, checked)
                              }
                            />
                            <span>
                              <span className="block font-medium">
                                {item.key}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {translateDescription(item.description, item.key) ||
                                  `${item.module}.${item.action}`}
                              </span>
                            </span>
                          </span>
                          <span className="flex gap-1">
                            <Badge variant="outline" className="text-[10px]">
                              {SCOPE_LABELS[item.scopeType] || item.scopeType}
                            </Badge>
                            {item.isSensitive ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Nháº¡y cáº£m
                              </Badge>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  ),
                )}
              </div>
              <div className="flex items-center justify-between rounded border p-3 text-sm">
                <span>ÄÃ£ chá»n: {permissionKeys.length}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    refreshPreview(editingEmployee?._id || "new-user-preview")
                  }
                >
                  {previewLoading
                    ? "Äang táº£i báº£n xem trÆ°á»›c..."
                    : "Táº£i láº¡i báº£n xem trÆ°á»›c"}
                </Button>
              </div>
              {sensitivePermissions.length ? (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Quyá»n nháº¡y cáº£m
                  </div>
                  <div>
                    CÃ¡c quyá»n nháº¡y cáº£m (key ká»¹ thuáº­t):{" "}
                    {sensitivePermissions.join(", ")}
                  </div>
                </div>
              ) : null}
              {preview ? (
                <div className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                  Quyá»n hiá»‡u lá»±c: {preview.assignments?.length || 0}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded border p-3 text-sm text-muted-foreground">
              TÃ­nh nÄƒng phÃ¢n quyá»n chi tiáº¿t Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const hasFilter =
    searchQuery ||
    statusFilter !== "ALL" ||
    provinceFilter !== "ALL" ||
    storeFilter !== "ALL";
  const canContinue =
    step === 1
      ? normalize(formData.fullName) &&
        normalize(formData.phoneNumber) &&
        (editingEmployee || normalize(formData.password))
      : step === 2
        ? !(roleNeedsBranch || hasBranchScopedPermission) ||
          branchIds.length > 0
        : true;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quáº£n lÃ½ nhÃ¢n viÃªn</h1>
        <Button onClick={openCreateDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          ThÃªm nhÃ¢n viÃªn
        </Button>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setSearchQuery("");
          setStatusFilter("ALL");
          setProvinceFilter("ALL");
          setStoreFilter("ALL");
        }}
      >
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-9">
          {EMPLOYEE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="TÃ¬m tÃªn, email, sá»‘ Ä‘iá»‡n thoáº¡i..."
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tráº¡ng thÃ¡i" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Táº¥t cáº£</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="LOCKED">LOCKED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={provinceFilter} onValueChange={setProvinceFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tá»‰nh/ThÃ nh" />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            <SelectItem value="ALL">Táº¥t cáº£ tá»‰nh/thÃ nh</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isGlobalAdmin ? (
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Chi nhÃ¡nh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Táº¥t cáº£ chi nhÃ¡nh</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {hasFilter ? (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setProvinceFilter("ALL");
              setStoreFilter("ALL");
            }}
          >
            <X className="mr-2 h-4 w-4" />
            XÃ³a bá»™ lá»c
          </Button>
        ) : null}
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : filteredEmployees.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {hasFilter ? "KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn" : "ChÆ°a cÃ³ nhÃ¢n viÃªn nÃ o"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.map((emp) => (
            <Card key={emp._id}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <Avatar className="h-12 w-12">
                    {emp.avatar ? (
                      <AvatarImage src={emp.avatar} alt={emp.fullName} />
                    ) : (
                      <AvatarFallback>
                        {getNameInitials(emp.fullName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Badge
                    className={
                      emp.status === "ACTIVE"
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white"
                    }
                  >
                    {getStatusText(emp.status)}
                  </Badge>
                </div>
                <h3 className="font-semibold">{emp.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  {emp.phoneNumber}
                </p>
                {emp.email ? (
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                ) : null}
                {emp.storeLocation ? (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    <MapPin className="mr-1 h-3 w-3" />
                    {stores.find(
                      (s) => normalize(s._id) === normalize(emp.storeLocation),
                    )?.name || "Chi nhÃ¡nh"}
                  </Badge>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(emp)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleStatus(emp._id)}
                  >
                    {emp.status === "ACTIVE" ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeEmployee(emp._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {pagination.totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === 1}
            onClick={() => fetchEmployees(pagination.currentPage - 1)}
          >
            TrÆ°á»›c
          </Button>
          <span className="text-sm">
            Trang {pagination.currentPage}/{pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => fetchEmployees(pagination.currentPage + 1)}
          >
            Sau
          </Button>
        </div>
      ) : null}

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) =>
          open ? setShowCreateDialog(true) : closeDialog()
        }
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ThÃªm nhÃ¢n viÃªn má»›i</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {renderWizard()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Há»§y
              </Button>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => prev - 1)}
                >
                  Quay láº¡i
                </Button>
              ) : null}
              {step < 3 ? (
                <Button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep((prev) => prev + 1)}
                >
                  Tiáº¿p tá»¥c
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    ((roleNeedsBranch || hasBranchScopedPermission) &&
                      branchIds.length === 0)
                  }
                >
                  {isSubmitting ? "Äang táº¡o..." : "Táº¡o nhÃ¢n viÃªn"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {editingEmployee ? (
        <Dialog
          open={Boolean(editingEmployee)}
          onOpenChange={(open) => (!open ? closeDialog() : null)}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chá»‰nh sá»­a nhÃ¢n viÃªn</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {renderWizard()}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Há»§y
                </Button>
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((prev) => prev - 1)}
                  >
                    Quay láº¡i
                  </Button>
                ) : null}
                {step < 3 ? (
                  <Button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => setStep((prev) => prev + 1)}
                  >
                    Tiáº¿p tá»¥c
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      ((roleNeedsBranch || hasBranchScopedPermission) &&
                        branchIds.length === 0)
                    }
                  >
                    {isSubmitting ? "Äang cáº­p nháº­t..." : "Cáº­p nháº­t"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};

export default EmployeesPage;
