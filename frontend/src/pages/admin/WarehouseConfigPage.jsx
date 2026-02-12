// ============================================
// FILE: frontend/src/pages/admin/WarehouseConfigPage.jsx
// Trang quản lý cấu hình kho
// ============================================

import React, { useState, useEffect } from "react";
import {
  Warehouse,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  MapPin,
  Layers,
  Grid,
  Package,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";

const WarehouseConfigPage = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");

  // Form state
  const [formData, setFormData] = useState({
    warehouseCode: "",
    name: "",
    address: "",
    totalArea: "",
    zones: [],
    status: "PLANNING",
  });

  const [currentZone, setCurrentZone] = useState({
    code: "",
    name: "",
    description: "",
    area: "",
    aisles: 1,
    shelvesPerAisle: 5,
    binsPerShelf: 10,
    capacityPerBin: 100,
    productCategories: [],
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/warehouse/config");
      setWarehouses(res.data.warehouses || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("Không thể tải danh sách kho");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setCurrentWarehouse(null);
    setFormData({
      warehouseCode: "",
      name: "",
      address: "",
      totalArea: "",
      zones: [],
      status: "PLANNING",
    });
    setShowModal(true);
  };

  const handleEdit = (warehouse) => {
    setEditMode(true);
    setCurrentWarehouse(warehouse);
    setFormData({
      warehouseCode: warehouse.warehouseCode,
      name: warehouse.name,
      address: warehouse.address || "",
      totalArea: warehouse.totalArea || "",
      zones: warehouse.zones || [],
      status: warehouse.status,
    });
    setShowModal(true);
  };

  const handleAddZone = () => {
    if (!currentZone.code || !currentZone.name) {
      toast.error("Vui lòng nhập mã khu và tên khu");
      return;
    }

    // Check duplicate zone code
    if (formData.zones.some((z) => z.code === currentZone.code)) {
      toast.error("Mã khu đã tồn tại");
      return;
    }

    setFormData({
      ...formData,
      zones: [...formData.zones, { ...currentZone }],
    });

    // Reset zone form
    setCurrentZone({
      code: "",
      name: "",
      description: "",
      area: "",
      aisles: 1,
      shelvesPerAisle: 5,
      binsPerShelf: 10,
      capacityPerBin: 100,
      productCategories: [],
      status: "ACTIVE",
    });

    toast.success("Đã thêm khu");
  };

  const handleRemoveZone = (index) => {
    const newZones = formData.zones.filter((_, i) => i !== index);
    setFormData({ ...formData, zones: newZones });
    toast.success("Đã xóa khu");
  };

  const handleSubmit = async () => {
    if (!formData.warehouseCode || !formData.name) {
      toast.error("Vui lòng nhập mã kho và tên kho");
      return;
    }

    if (formData.zones.length === 0) {
      toast.error("Kho phải có ít nhất 1 khu");
      return;
    }

    try {
      setLoading(true);

      if (editMode) {
        await api.put(`/warehouse/config/${currentWarehouse._id}`, formData);
        toast.success("Đã cập nhật kho");
      } else {
        await api.post("/warehouse/config", formData);
        toast.success("Đã tạo kho");
      }

      setShowModal(false);
      fetchWarehouses();
    } catch (error) {
      console.error("Error saving warehouse:", error);
      toast.error(error.response?.data?.message || "Lỗi khi lưu kho");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa kho này?")) return;

    try {
      await api.delete(`/warehouse/config/${id}`);
      toast.success("Đã xóa kho");
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa kho");
    }
  };

  const handleGenerateLocations = async (id) => {
    if (
      !confirm(
        "Tạo vị trí kho sẽ tạo tất cả các vị trí theo cấu hình. Bạn có chắc chắn?"
      )
    )
      return;

    try {
      setLoading(true);
      const res = await api.post(`/warehouse/config/${id}/generate-locations`);
      toast.success(res.data.message);
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tạo vị trí");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseStats = async (id) => {
    try {
      const res = await api.get(`/warehouse/config/${id}/stats`);
      setStats(res.data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const calculateEstimatedLocations = (zones) => {
    return zones.reduce(
      (total, zone) =>
        total + zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf,
      0
    );
  };

  const getStatusBadge = (status) => {
    const config = {
      PLANNING: { color: "bg-yellow-100 text-yellow-800", label: "Đang lập" },
      ACTIVE: { color: "bg-green-100 text-green-800", label: "Hoạt động" },
      INACTIVE: { color: "bg-gray-100 text-gray-800", label: "Ngưng hoạt động" },
    };
    const c = config[status] || config.PLANNING;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Warehouse className="w-8 h-8 mr-3" />
            Quản Lý Cấu Hình Kho
          </h1>
          <p className="text-gray-600 mt-2">
            Tạo và quản lý cấu trúc kho của bạn
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo Kho Mới
        </Button>
      </div>

      {/* Warehouse List */}
      {loading && warehouses.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Warehouse className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Chưa có kho nào</h3>
            <p className="text-gray-600 mb-6">
              Tạo kho đầu tiên để bắt đầu quản lý hàng hóa
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Kho Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => (
            <Card key={warehouse._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-2">
                      {warehouse.warehouseCode}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{warehouse.name}</p>
                  </div>
                  {getStatusBadge(warehouse.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <Layers className="w-4 h-4 text-blue-600 mr-1" />
                        <span className="text-xs text-gray-600">Số khu</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {warehouse.zones.length}
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <MapPin className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xs text-gray-600">Vị trí</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {warehouse.totalLocations || calculateEstimatedLocations(warehouse.zones)}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  {warehouse.address && (
                    <p className="text-sm text-gray-600">
                      📍 {warehouse.address}
                    </p>
                  )}

                  {/* Area */}
                  {warehouse.totalArea && (
                    <p className="text-sm text-gray-600">
                      📐 Diện tích: {warehouse.totalArea}m²
                    </p>
                  )}

                  {/* Zones Preview */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Các khu:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {warehouse.zones.slice(0, 4).map((zone, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {zone.code}
                        </Badge>
                      ))}
                      {warehouse.zones.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{warehouse.zones.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    {!warehouse.locationsGenerated ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(warehouse)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateLocations(warehouse._id)}
                          className="flex-1"
                        >
                          <Grid className="w-4 h-4 mr-1" />
                          Tạo Vị Trí
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWarehouse(warehouse);
                          fetchWarehouseStats(warehouse._id);
                        }}
                        className="flex-1"
                      >
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Xem Thống Kê
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(warehouse._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {warehouse.locationsGenerated && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-xs text-green-800 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Đã tạo {warehouse.totalLocations} vị trí
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Sửa Cấu Hình Kho" : "Tạo Kho Mới"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Thông Tin Cơ Bản</TabsTrigger>
              <TabsTrigger value="zones">Cấu Hình Khu</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mã Kho *</Label>
                  <Input
                    placeholder="WH-HCM"
                    value={formData.warehouseCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warehouseCode: e.target.value.toUpperCase(),
                      })
                    }
                    disabled={editMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: WH-XXX (VD: WH-HCM, WH-HN)
                  </p>
                </div>

                <div>
                  <Label>Tên Kho *</Label>
                  <Input
                    placeholder="Kho Hồ Chí Minh"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Địa Chỉ</Label>
                <Input
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Diện Tích (m²)</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={formData.totalArea}
                  onChange={(e) =>
                    setFormData({ ...formData, totalArea: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Trạng Thái</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="PLANNING">Đang lập kế hoạch</option>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngưng hoạt động</option>
                </select>
              </div>
            </TabsContent>

            {/* Zones Tab */}
            <TabsContent value="zones" className="space-y-4">
              {/* Add Zone Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thêm Khu Mới</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Mã Khu *</Label>
                      <Input
                        placeholder="A"
                        value={currentZone.code}
                        onChange={(e) =>
                          setCurrentZone({
                            ...currentZone,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Tên Khu *</Label>
                      <Input
                        placeholder="Khu A - Điện thoại"
                        value={currentZone.name}
                        onChange={(e) =>
                          setCurrentZone({ ...currentZone, name: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Mô Tả</Label>
                    <Input
                      placeholder="Khu lưu điện thoại và phụ kiện"
                      value={currentZone.description}
                      onChange={(e) =>
                        setCurrentZone({
                          ...currentZone,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Số Dãy *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={currentZone.aisles}
                        onChange={(e) =>
                          setCurrentZone({
                            ...currentZone,
                            aisles: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Kệ/Dãy *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={currentZone.shelvesPerAisle}
                        onChange={(e) =>
                          setCurrentZone({
                            ...currentZone,
                            shelvesPerAisle: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Ô/Kệ *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={currentZone.binsPerShelf}
                        onChange={(e) =>
                          setCurrentZone({
                            ...currentZone,
                            binsPerShelf: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Sức chứa/Ô</Label>
                      <Input
                        type="number"
                        min="1"
                        value={currentZone.capacityPerBin}
                        onChange={(e) =>
                          setCurrentZone({
                            ...currentZone,
                            capacityPerBin: parseInt(e.target.value) || 100,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-900">
                      <strong>Dự kiến:</strong>{" "}
                      {currentZone.aisles *
                        currentZone.shelvesPerAisle *
                        currentZone.binsPerShelf}{" "}
                      vị trí | Sức chứa:{" "}
                      {currentZone.aisles *
                        currentZone.shelvesPerAisle *
                        currentZone.binsPerShelf *
                        currentZone.capacityPerBin}{" "}
                      sản phẩm
                    </p>
                  </div>

                  <Button onClick={handleAddZone} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm Khu
                  </Button>
                </CardContent>
              </Card>

              {/* Zones List */}
              {formData.zones.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    Danh Sách Khu ({formData.zones.length})
                  </h3>
                  {formData.zones.map((zone, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {zone.code} - {zone.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {zone.aisles} dãy × {zone.shelvesPerAisle} kệ ×{" "}
                              {zone.binsPerShelf} ô ={" "}
                              <strong>
                                {zone.aisles *
                                  zone.shelvesPerAisle *
                                  zone.binsPerShelf}
                              </strong>{" "}
                              vị trí
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Sức chứa:{" "}
                              {zone.aisles *
                                zone.shelvesPerAisle *
                                zone.binsPerShelf *
                                zone.capacityPerBin}{" "}
                              sản phẩm
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveZone(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <p className="text-sm text-green-900">
                      <strong>Tổng:</strong> {calculateEstimatedLocations(formData.zones)}{" "}
                      vị trí dự kiến
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {editMode ? "Cập Nhật" : "Tạo Kho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseConfigPage;
