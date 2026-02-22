// ============================================
// FILE: frontend/src/pages/admin/WarehouseVisualizerPage.jsx
// Trang visualizer kho hàng
// ============================================

import React, { useState, useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Status Configuration
const STATUS_CONFIG = {
  EMPTY: {
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    icon: CheckCircle2,
    label: "Trống",
    description: "Vị trí chưa có hàng (0%)"
  },
  PARTIAL: {
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    icon: Box,
    label: "Đang Chứa",
    description: "Vị trí còn chỗ trống (< 80%)"
  },
  NEAR_FULL: {
    color: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    icon: AlertTriangle,
    label: "Sắp Đầy",
    description: "Vị trí sắp đầy (> 80%)"
  },
  FULL: {
    color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    icon: AlertCircle,
    label: "Đầy",
    description: "Vị trí đã đầy (100%)"
  },
  INACTIVE: {
    color: "bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200",
    icon: Ban,
    label: "Vô Hiệu",
    description: "Vị trí tạm ngưng sử dụng"
  }
};

const WarehouseVisualizerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState(null);
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedBins, setHighlightedBins] = useState(new Set());
  const [activeZone, setActiveZone] = useState("ALL");
  const [selectedBin, setSelectedBin] = useState(null);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/warehouse/config/${id}/layout`);
        setWarehouse(res.data.warehouse);
        setLocations(res.data.locations);
        
        // Default to first zone if available
        if (res.data.warehouse.zones.length > 0) {
          setActiveZone(res.data.warehouse.zones[0].code);
        }
      } catch (error) {
        console.error("Error fetching layout:", error);
        toast.error("Không thể tải layout kho");
      } finally {
        setLoading(false);
      }
    };
    fetchLayout();
  }, [id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHighlightedBins(new Set());
      return;
    }

    try {
      const res = await api.get(`/warehouse/config/${id}/search-location?query=${searchQuery}`);
      // Group results by locationCode
      const groupedResults = res.data.results.reduce((acc, curr) => {
        const code = curr.location.locationCode;
        if (!acc[code]) {
             acc[code] = {
                 ...curr,
                 items: []
             };
        }
        acc[code].items.push(curr);
        return acc;
      }, {});
      
      const flatResults = Object.values(groupedResults);
      setSearchResults(flatResults);
      
      const newHighlights = new Set(flatResults.map(r => r.location.locationCode));
      setHighlightedBins(newHighlights);
      
      if (flatResults.length === 0) {
        toast.info("Không tìm thấy sản phẩm");
      } else {
        toast.success(`Tìm thấy ${flatResults.length} vị trí chứa sản phẩm`);
        // Switch to the zone of the first result if applicable
        const firstResult = flatResults[0];
        if (firstResult?.location?.zone) {
          setActiveZone(firstResult.location.zone);
        }
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Lỗi khi tìm kiếm");
    }
  };

  // Helper to group locations by Zone -> Aisle -> Shelf
  const getGroupedLocations = (zoneCode) => {
    const filtered = locations.filter(l => zoneCode === "ALL" || l.zone === zoneCode);
    
    // Group by Aisle
    const aisles = {};
    filtered.forEach(loc => {
      if (!aisles[loc.aisle]) aisles[loc.aisle] = {};
      if (!aisles[loc.aisle][loc.shelf]) aisles[loc.aisle][loc.shelf] = [];
      aisles[loc.aisle][loc.shelf].push(loc);
    });

    // Sort bins in shelves
    Object.keys(aisles).forEach(aisle => {
      Object.keys(aisles[aisle]).forEach(shelf => {
        aisles[aisle][shelf].sort((a, b) => a.bin.localeCompare(b.bin));
      });
    });

    return aisles;
  };

  const getBinStatus = (loc) => {
    if (loc.status !== "ACTIVE") return "INACTIVE";
    const fillRate = loc.currentLoad / loc.capacity;
    if (fillRate === 0) return "EMPTY";
    if (fillRate < 0.8) return "PARTIAL";
    if (fillRate < 1) return "NEAR_FULL";
    return "FULL";
  };

  const getBinConfig = (loc) => {
    return STATUS_CONFIG[getBinStatus(loc)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const groupedLocations = getGroupedLocations(activeZone);

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center text-gray-800">
              <Box className="w-5 h-5 mr-2 text-blue-600" />
              Sơ Đồ Kho: {warehouse?.name}
            </h1>
            <p className="text-xs text-gray-500">{warehouse?.warehouseCode}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-96">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm SKU hoặc tên sản phẩm..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>Tìm</Button>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 shrink-0">
         {Object.entries(STATUS_CONFIG).map(([key, config]) => {
             const Icon = config.icon;
             return (
                 <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border shadow-sm text-xs whitespace-nowrap">
                     <div className={`p-1 rounded-full ${config.color.split(' ')[0]} ${config.color.split(' ')[2]}`}>
                        <Icon className="w-3 h-3" />
                     </div>
                     <span className="font-medium text-gray-700">{config.label}</span>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{config.description}</p>
                            </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                 </div>
             );
         })}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 border rounded-lg bg-white shadow-sm flex overflow-hidden">
        {/* Sidebar for Search Results */}
        {searchResults.length > 0 && (
          <div className="w-80 bg-gray-50 border-r overflow-y-auto shrink-0 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-gray-700">Kết quả tìm kiếm</h3>
              <Badge variant="secondary">{searchResults.length}</Badge>
            </div>
            <div className="space-y-3">
              {searchResults.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setActiveZone(item.location.zone);
                     // Scroll logic would go here ideally
                  }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            {item.location.locationCode}
                        </Badge>
                    </div>
                  
                  {item.items.map((sub, sIdx) => (
                        <div key={sIdx} className="mb-2 last:mb-0 border-b last:border-0 pb-2 last:pb-0">
                            <p className="font-medium text-xs text-blue-700 truncate" title={sub.productName}>{sub.productName}</p>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                                <span>SKU: {sub.sku}</span>
                                <span className="font-bold text-gray-700">SL: {sub.quantity}</span>
                            </div>
                        </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Map */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          <Tabs value={activeZone} onValueChange={setActiveZone} className="h-full flex flex-col">
            <div className="bg-white border-b px-4 py-2 shadow-sm z-10">
              <TabsList className="bg-slate-100">
                {warehouse?.zones.map(z => (
                  <TabsTrigger key={z.code} value={z.code} className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      {z.name} <span className="ml-1 text-xs text-gray-500">({z.code})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-auto p-8">
              {Object.keys(groupedLocations).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Package className="w-20 h-20 mb-4 opacity-10" />
                  <p>Chọn một khu vực để xem sơ đồ</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {Object.keys(groupedLocations).sort().map(aisle => (
                    <div key={aisle} className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-transparent rounded-full opacity-50"></div>
                        <h3 className="flex items-center font-bold text-lg mb-6 text-gray-700 ml-2">
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Dãy {aisle}
                        </h3>
                      <div className="grid gap-8 ml-2">
                        {Object.keys(groupedLocations[aisle]).sort().map(shelf => (
                          <div key={shelf} className="flex gap-6 items-start bg-white p-4 rounded-xl border shadow-sm">
                            <div className="w-16 pt-2 flex flex-col items-center justify-center border-r pr-4">
                                <span className="text-xs text-gray-400 uppercase tracking-widest">Kệ</span>
                                <span className="text-2xl font-bold text-gray-700">{shelf}</span>
                            </div>
                            <div className="flex-1 grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                              {groupedLocations[aisle][shelf].map(bin => {
                                const config = getBinConfig(bin);
                                const StatusIcon = config.icon;
                                const isHighlighted = highlightedBins.has(bin.locationCode);

                                return (
                                <TooltipProvider key={bin.locationCode}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                            className={`
                                                group relative aspect-square rounded-lg border text-[10px] 
                                                flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                                                ${config.color}
                                                ${isHighlighted ? "ring-4 ring-yellow-400 ring-offset-2 z-10 scale-110 shadow-xl" : ""}
                                            `}
                                            onClick={() => setSelectedBin(bin)}
                                            >
                                            <div className="flex items-center gap-1 mb-1">
                                                <StatusIcon className="w-3 h-3 opacity-70" />
                                                <span className="font-bold text-xs">{bin.bin}</span>
                                            </div>
                                            
                                            <div className="w-full px-2">
                                                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-current opacity-60" 
                                                        style={{width: `${Math.min((bin.currentLoad/bin.capacity)*100, 100)}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-0 overflow-hidden rounded-lg shadow-xl" sideOffset={5}>
                                            <div className="bg-white p-3 border rounded-lg min-w-[200px]">
                                                <div className="flex items-center justify-between gap-4 mb-2 border-b pb-2">
                                                    <span className="font-bold text-sm">{bin.locationCode}</span>
                                                    <Badge variant="outline" className={`${config.color.split(' ')[2]} bg-transparent border-current`}>
                                                        {config.label}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <div className="flex justify-between">
                                                        <span>Sức chứa:</span>
                                                        <span className="font-mono font-bold">{bin.capacity}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Hiện có:</span>
                                                        <span className="font-mono font-bold">{bin.currentLoad}</span>
                                                    </div>
                                                    <div className="flex justify-between text-green-600">
                                                        <span>Còn trống:</span>
                                                        <span className="font-mono font-bold">{bin.capacity - bin.currentLoad}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      {/* Bin Detail Modal */}
      <Dialog open={!!selectedBin} onOpenChange={() => setSelectedBin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông Tin Vị Trí {selectedBin?.locationCode}</DialogTitle>
          </DialogHeader>
          
          {selectedBin && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <span className="text-xs text-gray-500 uppercase">Trạng Thái</span>
                  <div className="mt-1">
                    <Badge variant={selectedBin.status === "ACTIVE" ? "default" : "secondary"}>
                        {selectedBin.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                   <span className="text-xs text-gray-500 uppercase">Phân Loại</span>
                   <div className="mt-1 flex flex-wrap gap-1">
                        {selectedBin.productCategories?.length > 0 ? (
                            selectedBin.productCategories.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] h-5">{c}</Badge>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400">Chưa cấu hình</span>
                        )}
                   </div>
                </div>
              </div>

               <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                   <div className="bg-gray-50 px-4 py-2 border-b text-xs font-semibold text-gray-500">
                       SỨC CHỨA & SỬ DỤNG
                   </div>
                   <div className="p-4 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-gray-800">{selectedBin.currentLoad}</div>
                            <div className="text-xs text-gray-500 mt-1">Đã dùng</div>
                        </div>
                        <div className="border-x">
                             <div className="text-2xl font-bold text-gray-800">{selectedBin.capacity}</div>
                             <div className="text-xs text-gray-500 mt-1">Tổng sức chứa</div>
                        </div>
                        <div>
                             <div className="text-2xl font-bold text-green-600">
                                 {selectedBin.capacity - selectedBin.currentLoad}
                             </div>
                             <div className="text-xs text-gray-500 mt-1">Còn trống</div>
                        </div>
                   </div>
                   
                   {/* Visual Bar */}
                   <div className="px-4 pb-4">
                       <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                           <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    selectedBin.currentLoad/selectedBin.capacity > 0.9 ? 'bg-red-500' : 
                                    selectedBin.currentLoad/selectedBin.capacity > 0.7 ? 'bg-orange-500' : 'bg-blue-500'
                                }`}
                                style={{width: `${Math.min((selectedBin.currentLoad/selectedBin.capacity)*100, 100)}%`}}
                           ></div>
                       </div>
                   </div>
               </div>

              <div className="text-xs text-center text-gray-400">
                 {selectedBin.zoneName} • Dãy {selectedBin.aisle} • Kệ {selectedBin.shelf} • Ô {selectedBin.bin}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBin(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseVisualizerPage;
