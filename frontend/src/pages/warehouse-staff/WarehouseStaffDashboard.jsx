// ============================================
// FILE: frontend/src/pages/warehouse-staff/WarehouseStaffDashboard.jsx
// Dashboard cho nhân viên thủ kho - FIXED VERSION
// ============================================

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  TruckIcon, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, orderAPI } from "@/lib/api";

const WarehouseStaffDashboard = () => {
  const [stats, setStats] = useState({
    pendingPOs: 0,
    todayReceipts: 0,
    pendingPicks: 0,
    lowStockItems: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Purchase Orders với status CONFIRMED
      const posRes = await api.get("/warehouse/purchase-orders?status=CONFIRMED");
      
      // Fetch Goods Receipts hôm nay
      const today = new Date().toISOString().split('T')[0];
      const receiptsRes = await api.get(`/warehouse/goods-receipt?page=1&limit=100`);
      const todayReceipts = receiptsRes.data.goodsReceipts?.filter(gr => {
        const grDate = new Date(gr.receivedDate).toISOString().split('T')[0];
        return grDate === today;
      }) || [];

      // Fetch Orders that are in warehouse queue stages (confirmed + picking)
      const pickStages = ["CONFIRMED", "PICKING"];
      const orderResponses = await Promise.all(
        pickStages.map((statusStage) =>
          orderAPI.getByStage(statusStage, { limit: 100 })
        )
      );
      const pendingPicks = orderResponses.reduce((sum, response) => {
        const byPagination = response.data.pagination?.total;
        if (Number.isFinite(byPagination)) return sum + byPagination;
        return sum + (response.data.orders?.length || 0);
      }, 0);

      setStats({
        pendingPOs: posRes.data.pagination?.total || posRes.data.purchaseOrders?.length || 0,
        todayReceipts: todayReceipts.length,
        pendingPicks,
        lowStockItems: 0, // TODO: Implement low stock API
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Nhận Hàng",
      description: "Nhập hàng từ nhà cung cấp",
      icon: TruckIcon,
      color: "bg-blue-500",
      link: "/warehouse-staff/receive-goods",
    },
    {
      title: "Xuất Kho",
      description: "Lấy hàng cho đơn hàng",
      icon: Package,
      color: "bg-green-500",
      link: "/warehouse-staff/pick-orders",
    },
    {
      title: "Chuyển Kho",
      description: "Chuyển hàng giữa các vị trí",
      icon: RefreshCw,
      color: "bg-purple-500",
      link: "/warehouse-staff/transfer",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản Lý Kho</h1>
        <p className="text-gray-600 mt-2">Theo dõi và quản lý hoạt động kho hàng</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đơn Hàng Chờ Nhận</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pendingPOs}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">PO đã được duyệt</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nhập Kho Hôm Nay</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.todayReceipts}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Phiếu nhập đã hoàn thành</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đơn Cần Xuất Kho</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.pendingPicks}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Link to="/warehouse-staff/pick-orders">
              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                Bắt đầu lấy hàng →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng Đơn Hàng</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.pendingPOs + stats.todayReceipts + stats.pendingPicks}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Tổng hoạt động</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tác Vụ Nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hướng Dẫn Sử Dụng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <TruckIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nhận Hàng</p>
                  <p className="text-xs text-gray-600">Quét mã PO → Kiểm hàng → Chọn vị trí → Hoàn tất</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Package className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Xuất Kho</p>
                  <p className="text-xs text-gray-600">Chọn đơn → Quét vị trí → Lấy hàng → In phiếu</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Chuyển Kho</p>
                  <p className="text-xs text-gray-600">Nhập SKU → Chọn vị trí nguồn/đích → Xác nhận</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống Kê Hôm Nay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phiếu nhập kho</span>
                <Badge variant="outline">{stats.todayReceipts}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Đơn chờ xuất</span>
                <Badge variant="outline">{stats.pendingPicks}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">PO chờ nhận</span>
                <Badge variant="outline">{stats.pendingPOs}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WarehouseStaffDashboard;
