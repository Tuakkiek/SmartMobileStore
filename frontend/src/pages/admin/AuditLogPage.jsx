import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  Eye,
  Filter,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

const SERVER_PAGE_LIMIT = 200;
const TABLE_PAGE_LIMIT = 20;
const MAX_ANALYTICS_RECORDS = 4000;

const PRESET_ACTION_TYPES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "READ",
  "UPDATE_STATUS",
  "ASSIGN_CARRIER",
  "PROCESS_CARRIER_WEBHOOK",
  "CREATE_POS_ORDER",
  "PROCESS_POS_PAYMENT",
  "CANCEL_ORDER",
];

const createDefaultFilters = () => ({
  fromDate: null,
  toDate: null,
  actionType: "ALL",
  entityType: "ORDER",
  outcome: "ALL",
  actor: "",
  branchId: "ALL",
  branchIdInput: "",
  search: "",
  orderId: "",
});

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());

const toStartOfDayISOString = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const toEndOfDayISOString = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const toDayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDayLabel = (dayKey) => {
  if (!dayKey) return "N/A";
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const safeJsonStringify = (value) => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return "Unable to render JSON";
  }
};

const getActorLabel = (log) => {
  const actorType = String(log?.actor?.actorType || "").toUpperCase();
  const userId = log?.actor?.userId ? String(log.actor.userId) : "";
  const role = log?.actor?.role ? String(log.actor.role) : "";

  if (actorType === "SYSTEM" && !userId) {
    return "SYSTEM";
  }

  if (userId && role) {
    return `${userId} (${role})`;
  }

  if (userId) {
    return userId;
  }

  if (role) {
    return role;
  }

  return actorType || "N/A";
};

const buildSearchText = (log) => {
  const changedPaths = Array.isArray(log?.changedPaths) ? log.changedPaths.join(" ") : "";
  const parts = [
    log?._id,
    log?.entityId,
    log?.entityType,
    log?.actionType,
    log?.outcome,
    log?.note,
    log?.reason,
    changedPaths,
    log?.requestContext?.path,
    log?.requestContext?.method,
    log?.failureContext?.errorCode,
    log?.failureContext?.errorMessage,
    log?.actor?.userId ? String(log.actor.userId) : "",
    log?.actor?.role,
    log?.actor?.actorType,
    log?.actor?.source,
  ];
  return parts
    .map((part) => String(part || "").toLowerCase())
    .join(" ")
    .trim();
};

const JsonBlock = ({ data }) => (
  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-5">
    {safeJsonStringify(data)}
  </pre>
);

const AuditLogPage = () => {
  const { user, authz } = useAuthStore();
  const isGlobalAdmin = Boolean(
    authz?.isGlobalAdmin || String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN"
  );

  const [activeTab, setActiveTab] = useState("logs");
  const [filtersDraft, setFiltersDraft] = useState(createDefaultFilters);
  const [filtersApplied, setFiltersApplied] = useState(createDefaultFilters);
  const [logsRaw, setLogsRaw] = useState([]);
  const [logsFiltered, setLogsFiltered] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [fetchMeta, setFetchMeta] = useState({
    truncated: false,
    fetchedCount: 0,
    serverTotalEstimate: 0,
  });

  const actionOptions = useMemo(() => {
    const fromLogs = logsRaw.map((item) => String(item?.actionType || "").trim()).filter(Boolean);
    const unique = [...new Set([...PRESET_ACTION_TYPES, ...fromLogs])].sort();
    return ["ALL", ...unique];
  }, [logsRaw]);

  const entityOptions = useMemo(() => {
    const fromLogs = logsRaw.map((item) => String(item?.entityType || "").trim()).filter(Boolean);
    const unique = [...new Set(["ORDER", ...fromLogs])].sort();
    return ["ALL", ...unique];
  }, [logsRaw]);

  const applyClientFilters = useCallback((logs, filters) => {
    const searchKeyword = String(filters.search || "").trim().toLowerCase();
    const actorKeyword = String(filters.actor || "").trim().toLowerCase();
    const useActorFallback = Boolean(actorKeyword) && !isObjectId(actorKeyword);
    const entityFilter = String(filters.entityType || "ALL").trim().toUpperCase();

    return logs.filter((log) => {
      const entityType = String(log?.entityType || "").toUpperCase();
      if (entityFilter !== "ALL" && entityType !== entityFilter) {
        return false;
      }

      if (useActorFallback) {
        const actorFields = [
          log?.actor?.userId ? String(log.actor.userId) : "",
          log?.actor?.role,
          log?.actor?.actorType,
          log?.actor?.source,
        ]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");

        if (!actorFields.includes(actorKeyword)) {
          return false;
        }
      }

      if (searchKeyword && !buildSearchText(log).includes(searchKeyword)) {
        return false;
      }

      return true;
    });
  }, []);

  const fetchAuditLogs = useCallback(
    async (appliedFilters) => {
      if (!isGlobalAdmin) return;

      if (
        appliedFilters.fromDate &&
        appliedFilters.toDate &&
        new Date(appliedFilters.fromDate) > new Date(appliedFilters.toDate)
      ) {
        const message = "Từ ngày phải sớm hơn Đến ngày";
        setError(message);
        toast.error(message);
        return;
      }

      setTableLoading(true);
      setAnalyticsLoading(true);
      setError("");

      try {
        const params = {
          limit: SERVER_PAGE_LIMIT,
        };

        if (appliedFilters.fromDate) {
          params.from = toStartOfDayISOString(appliedFilters.fromDate);
        }
        if (appliedFilters.toDate) {
          params.to = toEndOfDayISOString(appliedFilters.toDate);
        }
        if (appliedFilters.actionType && appliedFilters.actionType !== "ALL") {
          params.actionType = appliedFilters.actionType;
        }
        if (appliedFilters.outcome && appliedFilters.outcome !== "ALL") {
          params.outcome = appliedFilters.outcome;
        }

        const actorValue = String(appliedFilters.actor || "").trim();
        if (actorValue && isObjectId(actorValue)) {
          params.actorUserId = actorValue;
        }

        const orderId = String(appliedFilters.orderId || "").trim();
        if (orderId) {
          params.orderId = orderId;
        }

        const branchIdInput = String(appliedFilters.branchIdInput || "").trim();
        if (branchIdInput) {
          params.branchId = branchIdInput;
        } else if (appliedFilters.branchId === "NO_BRANCH") {
          params.branchId = "null";
        } else if (appliedFilters.branchId && appliedFilters.branchId !== "ALL") {
          params.branchId = appliedFilters.branchId;
        }

        let page = 1;
        let pages = 1;
        let totalEstimate = 0;
        let truncated = false;
        let combinedLogs = [];

        while (page <= pages) {
          const response = await api.get("/audit-logs/orders", {
            params: {
              ...params,
              page,
            },
          });

          const payload = response.data?.data || {};
          const pageLogs = Array.isArray(payload.logs) ? payload.logs : [];
          const pagination = payload.pagination || {};

          if (page === 1) {
            const parsedPages = Number(pagination.pages || 1);
            pages = Number.isFinite(parsedPages) && parsedPages > 0 ? parsedPages : 1;
            totalEstimate = Number(pagination.total || pageLogs.length || 0);
          }

          combinedLogs = combinedLogs.concat(pageLogs);

          if (combinedLogs.length >= MAX_ANALYTICS_RECORDS) {
            combinedLogs = combinedLogs.slice(0, MAX_ANALYTICS_RECORDS);
            truncated = true;
            break;
          }

          if (page >= pages) break;
          page += 1;
        }

        if (truncated) {
          toast.warning(
            `Dữ liệu phân tích được giới hạn trong ${MAX_ANALYTICS_RECORDS.toLocaleString("vi-VN")} bản ghi`
          );
        }

        const filtered = applyClientFilters(combinedLogs, appliedFilters);
        setLogsRaw(combinedLogs);
        setLogsFiltered(filtered);
        setTablePage(1);
        setFetchMeta({
          truncated,
          fetchedCount: combinedLogs.length,
          serverTotalEstimate: totalEstimate,
        });
      } catch (fetchError) {
        const message = fetchError.response?.data?.message || "Lấy nhật ký hoạt động thất bại";
        setError(message);
        setLogsRaw([]);
        setLogsFiltered([]);
        setFetchMeta({
          truncated: false,
          fetchedCount: 0,
          serverTotalEstimate: 0,
        });
        toast.error(message);
      } finally {
        setTableLoading(false);
        setAnalyticsLoading(false);
      }
    },
    [applyClientFilters, isGlobalAdmin]
  );

  useEffect(() => {
    if (!isGlobalAdmin) return;
    fetchAuditLogs(filtersApplied);
  }, [fetchAuditLogs, filtersApplied, isGlobalAdmin]);

  useEffect(() => {
    if (!isGlobalAdmin) return;

    const fetchStores = async () => {
      try {
        const response = await api.get("/stores", {
          params: {
            limit: 200,
            status: "ACTIVE",
          },
        });
        const list = response.data?.stores || response.data?.data?.stores || [];
        setStores(Array.isArray(list) ? list : []);
      } catch (storeError) {
        console.error("Lấy danh sách cửa hàng cho bộ máy lọc thất bại", storeError);
      }
    };

    fetchStores();
  }, [isGlobalAdmin]);

  const totalTablePages = useMemo(() => {
    if (logsFiltered.length === 0) return 1;
    return Math.ceil(logsFiltered.length / TABLE_PAGE_LIMIT);
  }, [logsFiltered.length]);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

  const tableRows = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_LIMIT;
    return logsFiltered.slice(start, start + TABLE_PAGE_LIMIT);
  }, [logsFiltered, tablePage]);

  const analyticsData = useMemo(() => {
    const total = logsFiltered.length;
    const successCount = logsFiltered.filter((item) => item?.outcome === "SUCCESS").length;
    const failedCount = logsFiltered.filter((item) => item?.outcome === "FAILED").length;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;

    const dailyMap = new Map();
    const actionMap = new Map();
    const userMap = new Map();
    const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      count: 0,
    }));
    const weekdayCounters = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    };

    logsFiltered.forEach((log) => {
      const dayKey = toDayKey(log?.createdAt);
      if (dayKey) {
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
      }

      const actionType = String(log?.actionType || "UNKNOWN").trim().toUpperCase();
      actionMap.set(actionType, (actionMap.get(actionType) || 0) + 1);

      const actorLabel = getActorLabel(log);
      userMap.set(actorLabel, (userMap.get(actorLabel) || 0) + 1);

      const date = new Date(log?.createdAt);
      if (!Number.isNaN(date.getTime())) {
        hourlyCounts[date.getHours()].count += 1;
        weekdayCounters[date.getDay()] += 1;
      }
    });

    const dailyCounts = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({
        day,
        label: formatDayLabel(day),
        count,
      }));

    const topActions = [...actionMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = [...userMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byWeekday = [
      { day: "Th 2", count: weekdayCounters[1] },
      { day: "Th 3", count: weekdayCounters[2] },
      { day: "Th 4", count: weekdayCounters[3] },
      { day: "Th 5", count: weekdayCounters[4] },
      { day: "Th 6", count: weekdayCounters[5] },
      { day: "Th 7", count: weekdayCounters[6] },
      { day: "CN", count: weekdayCounters[0] },
    ];

    return {
      total,
      successCount,
      failedCount,
      successRate,
      dailyCounts,
      pieData: [
        { name: "SUCCESS", value: successCount, color: "#16a34a" },
        { name: "FAILED", value: failedCount, color: "#dc2626" },
      ],
      topActions,
      topUsers,
      hourlyCounts,
      byWeekday,
    };
  }, [logsFiltered]);

  const handleApplyFilters = () => {
    if (
      filtersDraft.fromDate &&
      filtersDraft.toDate &&
      new Date(filtersDraft.fromDate) > new Date(filtersDraft.toDate)
    ) {
      toast.error("Từ ngày phải sớm hơn Đến ngày");
      return;
    }
    setFiltersApplied({ ...filtersDraft });
  };

  const handleResetFilters = () => {
    const reset = createDefaultFilters();
    setFiltersDraft(reset);
    setFiltersApplied(reset);
  };

  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleDraftChange = (key, value) => {
    setFiltersDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!isGlobalAdmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Từ chối truy cập</CardTitle>
            <CardDescription>
              Trang này chỉ dành cho QUẢN TRỊ VIÊN CẤP CAO.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            Nhật ký hệ thống
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi bảo mật và phân tích lịch sử các ĐƠN HÀNG.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {fetchMeta.serverTotalEstimate > 0 ? (
            <span>
              Đã tải {fetchMeta.fetchedCount.toLocaleString("vi-VN")} /{" "}
              {fetchMeta.serverTotalEstimate.toLocaleString("vi-VN")} mục
            </span>
          ) : (
            <span>Không có dữ liệu</span>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="flex items-start gap-2 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-5">
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="actions">Hành động</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="trends">Xu hướng</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-4 w-4" />
                Bộ lọc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <DatePicker
                  value={filtersDraft.fromDate}
                  onChange={(date) => handleDraftChange("fromDate", date)}
                  placeholder="Từ ngày"
                  maxDate={filtersDraft.toDate || undefined}
                />
                <DatePicker
                  value={filtersDraft.toDate}
                  onChange={(date) => handleDraftChange("toDate", date)}
                  placeholder="Đến ngày"
                  minDate={filtersDraft.fromDate || undefined}
                />

                <Select
                  value={filtersDraft.actionType}
                  onValueChange={(value) => handleDraftChange("actionType", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Loại hành động" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filtersDraft.entityType}
                  onValueChange={(value) => handleDraftChange("entityType", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Loại thực thể" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filtersDraft.outcome}
                  onValueChange={(value) => handleDraftChange("outcome", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kết quả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ALL</SelectItem>
                    <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filtersDraft.branchId}
                  onValueChange={(value) => handleDraftChange("branchId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả chi nhánh</SelectItem>
                    <SelectItem value="NO_BRANCH">Không chi nhánh</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={String(store._id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={filtersDraft.actor}
                  onChange={(event) => handleDraftChange("actor", event.target.value)}
                  placeholder="Người thực hiện (userId/vai trò)"
                />
                <Input
                  value={filtersDraft.branchIdInput}
                  onChange={(event) => handleDraftChange("branchIdInput", event.target.value)}
                  placeholder="Nhập ID Chi nhánh"
                />
                <Input
                  value={filtersDraft.orderId}
                  onChange={(event) => handleDraftChange("orderId", event.target.value)}
                  placeholder="ID Đơn hàng/Thực thể"
                />
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filtersDraft.search}
                    onChange={(event) => handleDraftChange("search", event.target.value)}
                    placeholder="Tìm kiếm từ khóa (ghi chú, đường dẫn, lỗi...)"
                    className="pl-10"
                  />
                </div>

                <Button onClick={handleApplyFilters} className="min-w-32">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Áp dụng
                </Button>
                <Button variant="outline" onClick={handleResetFilters} className="min-w-32">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Làm mới
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-4 w-4" />
                Mục nhật ký
              </CardTitle>
              <CardDescription>
                {logsFiltered.length.toLocaleString("vi-VN")} mục phù hợp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tableLoading ? (
                <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
                  Đang tải dữ liệu...
                </div>
              ) : logsFiltered.length === 0 ? (
                <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
                  Không tìm thấy mục nào cho bộ lọc hiện tại.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[170px]">Thời gian</TableHead>
                        <TableHead className="min-w-[220px]">Người thực hiện</TableHead>
                        <TableHead>Loại hành động</TableHead>
                        <TableHead>Loại thực thể</TableHead>
                        <TableHead>ID Thực thể</TableHead>
                        <TableHead>Kết quả</TableHead>
                        <TableHead className="min-w-[200px]">Tóm tắt thay đổi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map((log) => {
                        const changedCount = Array.isArray(log?.changedPaths)
                          ? log.changedPaths.length
                          : 0;
                        const note = String(log?.note || log?.reason || "").trim();
                        const roleText = String(log?.actor?.role || log?.actor?.actorType || "").trim();

                        return (
                          <TableRow
                            key={log._id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => handleOpenDetails(log)}
                          >
                            <TableCell>{formatDateTime(log?.createdAt)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{getActorLabel(log)}</div>
                                <div className="text-xs text-muted-foreground">{roleText || "N/A"}</div>
                              </div>
                            </TableCell>
                            <TableCell>{String(log?.actionType || "N/A")}</TableCell>
                            <TableCell>{String(log?.entityType || "N/A")}</TableCell>
                            <TableCell className="max-w-[180px] truncate">
                              {String(log?.entityId || "N/A")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  log?.outcome === "SUCCESS"
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-red-600 text-white hover:bg-red-700"
                                }
                              >
                                {String(log?.outcome || "N/A")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div>{changedCount} đường dẫn thay đổi</div>
                                <div className="line-clamp-2 text-xs text-muted-foreground">
                                  {note || "Không có ghi chú"}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {logsFiltered.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Trang {tablePage} / {totalTablePages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={tablePage <= 1}
                      onClick={() => setTablePage((prev) => Math.max(prev - 1, 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={tablePage >= totalTablePages}
                      onClick={() => setTablePage((prev) => Math.min(prev + 1, totalTablePages))}
                    >
                      Tiếp
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng số mục</p>
                    <p className="text-2xl font-bold">{analyticsData.total.toLocaleString("vi-VN")}</p>
                  </div>
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">SUCCESS</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {analyticsData.successCount.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">FAILED</p>
                    <p className="text-2xl font-bold text-red-600">
                      {analyticsData.failedCount.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tỷ lệ thành công</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {analyticsData.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-blue-700" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Số lượng mục theo ngày</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] animate-pulse rounded-md bg-muted/40" />
                ) : analyticsData.dailyCounts.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.dailyCounts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">THÀNH CÔNG vs THẤT BẠI</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] animate-pulse rounded-md bg-muted/40" />
                ) : analyticsData.total === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {analyticsData.pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
                Top 10 Loại Hành động
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[380px] animate-pulse rounded-md bg-muted/40" />
              ) : analyticsData.topActions.length === 0 ? (
                <div className="flex h-[380px] items-center justify-center text-sm text-muted-foreground">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={analyticsData.topActions} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={160} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-cyan-600" />
                Top 10 Người thực hiện
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[380px] animate-pulse rounded-md bg-muted/40" />
              ) : analyticsData.topUsers.length === 0 ? (
                <div className="flex h-[380px] items-center justify-center text-sm text-muted-foreground">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={analyticsData.topUsers} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={230} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hành động theo giờ</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[320px] animate-pulse rounded-md bg-muted/40" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analyticsData.hourlyCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" interval={2} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hành động theo thứ</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[320px] animate-pulse rounded-md bg-muted/40" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analyticsData.byWeekday}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Chi tiết nhật ký
            </DialogTitle>
            <DialogDescription>
              Toàn bộ dữ liệu của mục nhật ký bao gồm yêu cầu và ngữ cảnh thay đổi.
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Thời gian</p>
                  <p className="text-sm font-medium">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Người thực hiện</p>
                  <p className="text-sm font-medium">{getActorLabel(selectedLog)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Loại hành động</p>
                  <p className="text-sm font-medium">{selectedLog.actionType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Thực thể</p>
                  <p className="text-sm font-medium">
                    {selectedLog.entityType || "N/A"} / {selectedLog.entityId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kết quả</p>
                  <Badge
                    className={
                      selectedLog.outcome === "SUCCESS"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }
                  >
                    {selectedLog.outcome || "N/A"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID Chi nhánh</p>
                  <p className="text-sm font-medium">
                    {selectedLog.branchId ? String(selectedLog.branchId) : "null"}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Đường dẫn thay đổi</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedLog.changedPaths) && selectedLog.changedPaths.length > 0 ? (
                    selectedLog.changedPaths.map((path) => (
                      <Badge key={path} variant="outline">
                        {path}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Không có thay đổi đường dẫn nào</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">oldValues</p>
                  <JsonBlock data={selectedLog.oldValues || {}} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">newValues</p>
                  <JsonBlock data={selectedLog.newValues || {}} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">requestContext</p>
                  <JsonBlock data={selectedLog.requestContext || {}} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">failureContext</p>
                  <JsonBlock data={selectedLog.failureContext || {}} />
                </div>
                <div className="xl:col-span-2">
                  <p className="mb-2 text-sm font-semibold">metadata</p>
                  <JsonBlock data={selectedLog.metadata || {}} />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
