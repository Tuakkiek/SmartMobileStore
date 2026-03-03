// ============================================
// FILE: frontend/src/pages/admin/WarehouseVisualizerPage.jsx
// Warehouse visualizer with incremental aisle loading
// ============================================

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Box,
  Maximize2,
  Package,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Ban,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const AISLES_PER_PAGE = 3;

const STATUS_CONFIG = {
  EMPTY: {
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    icon: CheckCircle2,
    label: "Trống",
    description: "Vị trí chưa có hàng (0%)",
  },
  PARTIAL: {
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    icon: Box,
    label: "Đang chứa",
    description: "Vị trí còn chỗ trống (< 80%)",
  },
  NEAR_FULL: {
    color: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    icon: AlertTriangle,
    label: "Sắp đầy",
    description: "Vị trí sắp đầy (> 80%)",
  },
  FULL: {
    color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    icon: AlertCircle,
    label: "Đầy",
    description: "Vị trí đã đầy (100%)",
  },
  INACTIVE: {
    color: "bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200",
    icon: Ban,
    label: "Vô hiệu",
    description: "Vị trí tạm ngừng sử dụng",
  },
};

const sortAlphaNumeric = (left, right) => {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const getBinStatus = (location) => {
  if (location.status !== "ACTIVE") return "INACTIVE";

  const capacity = Number(location.capacity) || 0;
  const currentLoad = Number(location.currentLoad) || 0;
  const fillRate = capacity > 0 ? currentLoad / capacity : 0;

  if (fillRate === 0) return "EMPTY";
  if (fillRate < 0.8) return "PARTIAL";
  if (fillRate < 1) return "NEAR_FULL";
  return "FULL";
};

const getBinConfig = (location) => {
  return STATUS_CONFIG[getBinStatus(location)] || STATUS_CONFIG.EMPTY;
};

const groupLocationsByAisle = (locations = []) => {
  const grouped = {};

  for (const location of locations) {
    const aisleCode = String(location.aisle || "");
    const shelfCode = String(location.shelf || "");

    if (!grouped[aisleCode]) {
      grouped[aisleCode] = {};
    }
    if (!grouped[aisleCode][shelfCode]) {
      grouped[aisleCode][shelfCode] = [];
    }

    grouped[aisleCode][shelfCode].push(location);
  }

  for (const aisleCode of Object.keys(grouped)) {
    for (const shelfCode of Object.keys(grouped[aisleCode])) {
      grouped[aisleCode][shelfCode].sort((a, b) => sortAlphaNumeric(a.bin, b.bin));
    }
  }

  return grouped;
};

const mergeLocations = (current = [], incoming = []) => {
  const map = new Map();

  for (const location of current) {
    map.set(location.locationCode, location);
  }
  for (const location of incoming) {
    map.set(location.locationCode, location);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aisleSort = sortAlphaNumeric(a.aisle, b.aisle);
    if (aisleSort !== 0) return aisleSort;
    const shelfSort = sortAlphaNumeric(a.shelf, b.shelf);
    if (shelfSort !== 0) return shelfSort;
    return sortAlphaNumeric(a.bin, b.bin);
  });
};

const LoadingAisleSkeleton = () => {
  return (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, aisleIndex) => (
        <div key={aisleIndex} className="space-y-4">
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
          {Array.from({ length: 2 }).map((__, shelfIndex) => (
            <div key={shelfIndex} className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex gap-3 flex-wrap">
                {Array.from({ length: 20 }).map((___, binIndex) => (
                  <div
                    key={binIndex}
                    className="h-14 w-14 rounded-md border bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const BinCard = memo(function BinCard({ bin, isHighlighted, onSelect }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = getBinConfig(bin);
  const StatusIcon = config.icon;
  const capacity = Number(bin.capacity) || 0;
  const currentLoad = Number(bin.currentLoad) || 0;
  const fillPercent = capacity > 0 ? Math.min((currentLoad / capacity) * 100, 100) : 0;

  return (
    <Tooltip onOpenChange={(open) => setShowTooltip((prev) => prev || open)}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={[
            "group relative aspect-square rounded-lg border text-[10px]",
            "flex flex-col items-center justify-center transition-all duration-200",
            config.color,
            isHighlighted ? "ring-4 ring-yellow-400 ring-offset-2 z-10 scale-110 shadow-xl" : "",
          ].join(" ")}
          onClick={() => onSelect(bin)}
          onMouseEnter={() => setShowTooltip(true)}
          onFocus={() => setShowTooltip(true)}
        >
          <div className="flex items-center gap-1 mb-1">
            <StatusIcon className="w-3 h-3 opacity-70" />
            <span className="font-bold text-xs">{bin.bin}</span>
          </div>

          <div className="w-full px-2">
            <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
              <div className="h-full bg-current opacity-60" style={{ width: `${fillPercent}%` }} />
            </div>
          </div>
        </button>
      </TooltipTrigger>

      {showTooltip ? (
        <TooltipContent className="p-0 overflow-hidden rounded-lg shadow-xl" sideOffset={6}>
          <div className="bg-white p-3 border rounded-lg min-w-[200px]">
            <div className="flex items-center justify-between gap-4 mb-2 border-b pb-2">
              <span className="font-bold text-sm">{bin.locationCode}</span>
              <Badge
                variant="outline"
                className={`${config.color.split(" ")[2]} bg-transparent border-current`}
              >
                {config.label}
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Sức chứa:</span>
                <span className="font-mono font-bold">{capacity}</span>
              </div>
              <div className="flex justify-between">
                <span>Hiện có:</span>
                <span className="font-mono font-bold">{currentLoad}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Còn trống:</span>
                <span className="font-mono font-bold">{Math.max(capacity - currentLoad, 0)}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
});

const WarehouseVisualizerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, authz, contextMode, simulatedBranchId } = useAuthStore();

  const initialContextRef = React.useRef({ simulatedBranchId, contextMode });

  useEffect(() => {
    if (
      simulatedBranchId !== initialContextRef.current.simulatedBranchId ||
      contextMode !== initialContextRef.current.contextMode
    ) {
      toast.info("Chi nhánh thay đổi, đang tải lại danh sách kho...");
      navigate("/admin/warehouse-config", { replace: true });
    }
  }, [simulatedBranchId, contextMode, navigate]);

  const isGlobalAdmin = Boolean(
    authz?.isGlobalAdmin || String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN",
  );
  const normalizedMode = String(contextMode || authz?.contextMode || "STANDARD").toUpperCase();

  const [loadingWarehouse, setLoadingWarehouse] = useState(true);
  const [loadingZone, setLoadingZone] = useState(false);
  const [warehouse, setWarehouse] = useState(null);
  const [activeZone, setActiveZone] = useState("");

  const [locationsByZone, setLocationsByZone] = useState({});
  const [zonePage, setZonePage] = useState({});
  const [zoneHasMore, setZoneHasMore] = useState({});
  const [loadedAisles, setLoadedAisles] = useState({});
  const [aislesPerZone, setAislesPerZone] = useState({});

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedBins, setHighlightedBins] = useState(new Set());
  const [selectedBin, setSelectedBin] = useState(null);

  const markAislesLoaded = useCallback((zoneCode, aisles = []) => {
    if (!zoneCode || !Array.isArray(aisles) || aisles.length === 0) {
      return;
    }

    setLoadedAisles((previous) => {
      const next = { ...previous };
      for (const aisleCode of aisles) {
        if (!aisleCode) continue;
        next[`${zoneCode}:${aisleCode}`] = true;
      }
      return next;
    });

    setAislesPerZone((previous) => {
      const current = previous[zoneCode] || [];
      const merged = Array.from(new Set([...current, ...aisles])).sort(sortAlphaNumeric);
      return { ...previous, [zoneCode]: merged };
    });
  }, []);

  const upsertZoneLocations = useCallback((zoneCode, incomingLocations = [], append = true) => {
    setLocationsByZone((previous) => {
      const current = previous[zoneCode] || [];
      const merged = append ? mergeLocations(current, incomingLocations) : mergeLocations([], incomingLocations);
      return { ...previous, [zoneCode]: merged };
    });
  }, []);

  const loadZoneLayout = useCallback(
    async ({ zoneCode, page = 1, append = true, aisleCode = "" } = {}) => {
      if (!zoneCode) return;

      try {
        setLoadingZone(true);

        const params = new URLSearchParams();
        params.set("zone", zoneCode);

        if (aisleCode) {
          params.set("aisle", aisleCode);
        } else {
          params.set("page", String(page));
          params.set("limit", String(AISLES_PER_PAGE));
        }

        const response = await api.get(`/warehouse/config/${id}/layout?${params.toString()}`);
        const payload = response.data || {};
        const incoming = Array.isArray(payload.locations) ? payload.locations : [];

        upsertZoneLocations(zoneCode, incoming, append);

        const responseAisles =
          Array.isArray(payload?.meta?.aisles) && payload.meta.aisles.length > 0
            ? payload.meta.aisles
            : Array.from(new Set(incoming.map((location) => location.aisle)));
        markAislesLoaded(zoneCode, responseAisles);

        if (!aisleCode) {
          setZonePage((previous) => ({
            ...previous,
            [zoneCode]: Number(payload?.pagination?.page || page),
          }));
          setZoneHasMore((previous) => ({
            ...previous,
            [zoneCode]: Boolean(payload?.pagination?.hasNextPage),
          }));
        }
      } catch (error) {
        console.error("Error loading warehouse layout:", error);
        toast.error("Không thể tải layout kho");
      } finally {
        setLoadingZone(false);
      }
    },
    [id, markAislesLoaded, upsertZoneLocations]
  );

  const ensureAisleLoaded = useCallback(
    async (zoneCode, aisleCode) => {
      if (!zoneCode || !aisleCode) return;

      const aisleKey = `${zoneCode}:${aisleCode}`;
      if (loadedAisles[aisleKey]) {
        return;
      }

      await loadZoneLayout({
        zoneCode,
        aisleCode,
        append: true,
      });
    },
    [loadedAisles, loadZoneLayout]
  );

  useEffect(() => {
    const fetchWarehouseMeta = async () => {
      try {
        setLoadingWarehouse(true);
        setLocationsByZone({});
        setZonePage({});
        setZoneHasMore({});
        setLoadedAisles({});
        setAislesPerZone({});
        setSearchResults([]);
        setHighlightedBins(new Set());
        setSelectedBin(null);

        const response = await api.get(`/warehouse/config/${id}`);
        const nextWarehouse = response.data?.warehouse || null;
        setWarehouse(nextWarehouse);

        const firstZone = nextWarehouse?.zones?.[0]?.code || "";
        setActiveZone(firstZone);
      } catch (error) {
        console.error("Error fetching warehouse config:", error);
        toast.error("Không thể tải cấu hình kho");
      } finally {
        setLoadingWarehouse(false);
      }
    };

    fetchWarehouseMeta();
  }, [id]);

  useEffect(() => {
    if (!activeZone || !warehouse) return;

    const currentZoneLocations = locationsByZone[activeZone] || [];
    if (currentZoneLocations.length > 0) {
      return;
    }

    loadZoneLayout({
      zoneCode: activeZone,
      page: 1,
      append: false,
    });
  }, [activeZone, locationsByZone, loadZoneLayout, warehouse]);

  const handleLoadMoreAisles = useCallback(async () => {
    if (!activeZone || loadingZone || !zoneHasMore[activeZone]) {
      return;
    }

    const nextPage = (zonePage[activeZone] || 1) + 1;
    await loadZoneLayout({
      zoneCode: activeZone,
      page: nextPage,
      append: true,
    });
  }, [activeZone, loadZoneLayout, loadingZone, zoneHasMore, zonePage]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHighlightedBins(new Set());
      return;
    }

    try {
      const response = await api.get(
        `/warehouse/config/${id}/search-location?query=${encodeURIComponent(searchQuery.trim())}`
      );

      const groupedResults = (response.data?.results || []).reduce((accumulator, current) => {
        const code = current?.location?.locationCode;
        if (!code) return accumulator;

        if (!accumulator[code]) {
          accumulator[code] = {
            ...current,
            items: [],
          };
        }

        accumulator[code].items.push(current);
        return accumulator;
      }, {});

      const flattened = Object.values(groupedResults);
      setSearchResults(flattened);
      setHighlightedBins(new Set(flattened.map((entry) => entry.location.locationCode)));

      if (flattened.length === 0) {
        toast.info("Không tìm thấy sản phẩm");
        return;
      }

      const firstResult = flattened[0];
      const resultZone = firstResult?.location?.zone || "";
      const resultAisle = firstResult?.location?.aisle || "";

      if (resultZone) {
        setActiveZone(resultZone);
        await ensureAisleLoaded(resultZone, resultAisle);
      }

      toast.success(`Tìm thấy ${flattened.length} vị trí chứa sản phẩm`);
    } catch (error) {
      console.error("Error searching location:", error);
      toast.error("Lỗi khi tìm kiếm");
    }
  }, [ensureAisleLoaded, id, searchQuery]);

  const activeZoneLocations = useMemo(() => {
    return locationsByZone[activeZone] || [];
  }, [activeZone, locationsByZone]);

  const groupedLocations = useMemo(() => {
    return groupLocationsByAisle(activeZoneLocations);
  }, [activeZoneLocations]);

  const allAislesInZone = useMemo(() => {
    return Object.keys(groupedLocations).sort(sortAlphaNumeric);
  }, [groupedLocations]);

  const visibleAisles = useMemo(() => {
    return allAislesInZone.filter((aisleCode) => loadedAisles[`${activeZone}:${aisleCode}`]);
  }, [activeZone, allAislesInZone, loadedAisles]);

  const activeZoneLoadedAisles = aislesPerZone[activeZone] || [];

  if (loadingWarehouse) {
    return (
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)]">
        <div className="h-20 rounded-lg border bg-slate-100 animate-pulse mb-6" />
        <div className="h-[calc(100%-7rem)] rounded-lg border bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={260} skipDelayDuration={120}>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center text-gray-800">
                <Box className="w-5 h-5 mr-2 text-blue-600" />
                Sơ đồ kho: {warehouse?.name}
              </h1>
              <p className="text-xs text-gray-500">{warehouse?.warehouseCode}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-96">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm SKU hoặc tên sản phẩm..."
                className="pl-8"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>Tìm</Button>
          </div>
        </div>

        {/* {isGlobalAdmin ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Context mode:{" "}
            <strong>
              {normalizedMode === "SIMULATED"
                ? `SIMULATED (${simulatedBranchId || "unknown branch"})`
                : "ALL"}
            </strong>
          </div>
        ) : null} */}

        <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 shrink-0">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border shadow-sm text-xs whitespace-nowrap"
              >
                <div
                  className={`p-1 rounded-full ${config.color.split(" ")[0]} ${config.color.split(" ")[2]}`}
                >
                  <Icon className="w-3 h-3" />
                </div>
                <span className="font-medium text-gray-700">{config.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button">
                      <Info className="w-3 h-3 text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm flex overflow-hidden">
          {searchResults.length > 0 && (
            <div className="w-80 bg-gray-50 border-r overflow-y-auto shrink-0 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-gray-700">Kết quả tìm kiếm</h3>
                <Badge variant="secondary">{searchResults.length}</Badge>
              </div>
              <div className="space-y-3">
                {searchResults.map((item, index) => (
                  <div
                    key={`${item?.location?.locationCode || "loc"}-${index}`}
                    className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={async () => {
                      const zoneCode = item?.location?.zone || "";
                      const aisleCode = item?.location?.aisle || "";
                      if (!zoneCode) return;
                      setActiveZone(zoneCode);
                      await ensureAisleLoaded(zoneCode, aisleCode);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                      >
                        {item?.location?.locationCode}
                      </Badge>
                    </div>

                    {(item.items || []).map((subItem, subIndex) => (
                      <div
                        key={`${subItem?.sku || "sku"}-${subIndex}`}
                        className="mb-2 last:mb-0 border-b last:border-0 pb-2 last:pb-0"
                      >
                        <p
                          className="font-medium text-xs text-blue-700 truncate"
                          title={subItem.productName}
                        >
                          {subItem.productName}
                        </p>
                        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                          <span>SKU: {subItem.sku}</span>
                          <span className="font-bold text-gray-700">SL: {subItem.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            <Tabs value={activeZone} onValueChange={setActiveZone} className="h-full flex flex-col">
              <div className="bg-white border-b px-4 py-2 shadow-sm z-10">
                <div className="flex items-center justify-between gap-4">
                  <TabsList className="bg-slate-100">
                    {(warehouse?.zones || []).map((zone) => (
                      <TabsTrigger
                        key={zone.code}
                        value={zone.code}
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                      >
                        {zone.name}{" "}
                        <span className="ml-1 text-xs text-gray-500">({zone.code})</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <div className="text-xs text-gray-500 shrink-0">
                    Dãy đã tải: {activeZoneLoadedAisles.length}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-8">
                {loadingZone && visibleAisles.length === 0 ? (
                  <LoadingAisleSkeleton />
                ) : visibleAisles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Package className="w-20 h-20 mb-4 opacity-10" />
                    <p>Không có dữ liệu cho khu vực này</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {visibleAisles.map((aisleCode) => (
                      <div key={aisleCode} className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-transparent rounded-full opacity-50" />
                        <h3 className="flex items-center font-bold text-lg mb-6 text-gray-700 ml-2">
                          <Maximize2 className="w-4 h-4 mr-2" />
                          Dãy {aisleCode}
                        </h3>
                        <div className="grid gap-8 ml-2">
                          {Object.keys(groupedLocations[aisleCode] || {})
                            .sort(sortAlphaNumeric)
                            .map((shelfCode) => (
                              <div
                                key={`${aisleCode}-${shelfCode}`}
                                className="flex gap-6 items-start bg-white p-4 rounded-xl border shadow-sm"
                              >
                                <div className="w-16 pt-2 flex flex-col items-center justify-center border-r pr-4">
                                  <span className="text-xs text-gray-400 uppercase tracking-widest">
                                    Kệ
                                  </span>
                                  <span className="text-2xl font-bold text-gray-700">
                                    {shelfCode}
                                  </span>
                                </div>
                                <div className="flex-1 grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                                  {(groupedLocations[aisleCode][shelfCode] || []).map((bin) => (
                                    <BinCard
                                      key={bin.locationCode}
                                      bin={bin}
                                      isHighlighted={highlightedBins.has(bin.locationCode)}
                                      onSelect={setSelectedBin}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {zoneHasMore[activeZone] ? (
                  <div className="mt-10 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleLoadMoreAisles}
                      disabled={loadingZone}
                      className="min-w-40"
                    >
                      {loadingZone ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang tải...
                        </>
                      ) : (
                        "Xem thêm dãy"
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Tabs>
          </div>
        </div>

        <Dialog open={Boolean(selectedBin)} onOpenChange={() => setSelectedBin(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thông tin vị trí {selectedBin?.locationCode}</DialogTitle>
            </DialogHeader>

            {selectedBin ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <span className="text-xs text-gray-500 uppercase">Trạng thái</span>
                    <div className="mt-1">
                      <Badge variant={selectedBin.status === "ACTIVE" ? "default" : "secondary"}>
                        {selectedBin.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <span className="text-xs text-gray-500 uppercase">Phân loại</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(selectedBin.productCategories || []).length > 0 ? (
                        selectedBin.productCategories.map((category, index) => (
                          <Badge key={`${category}-${index}`} variant="outline" className="text-[10px] h-5">
                            {category}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Chưa cấu hình</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2 border-b text-xs font-semibold text-gray-500">
                    SỨC CHỨA VÀ SỬ DỤNG
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">
                        {Number(selectedBin.currentLoad) || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Đã dùng</div>
                    </div>
                    <div className="border-x">
                      <div className="text-2xl font-bold text-gray-800">
                        {Number(selectedBin.capacity) || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Tổng sức chứa</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {Math.max(
                          (Number(selectedBin.capacity) || 0) - (Number(selectedBin.currentLoad) || 0),
                          0
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Còn trống</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-center text-gray-400">
                  {selectedBin.zoneName} - Dãy {selectedBin.aisle} - Kệ {selectedBin.shelf} - Ô{" "}
                  {selectedBin.bin}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedBin(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default WarehouseVisualizerPage;
