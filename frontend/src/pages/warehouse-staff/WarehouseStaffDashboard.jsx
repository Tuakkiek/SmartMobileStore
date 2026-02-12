// ============================================
// FILE: frontend/src/pages/warehouse-staff/WarehouseStaffDashboard.jsx
// Dashboard cho nhân viên thủ kho
// ============================================

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  TruckIcon, 
  RefreshCw, 
  ClipboardList, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

const WarehouseStaffDashboard = () => {
  const [stats, setStats] = useState({
    pendingPOs: 0,
    todayReceipts: 0,
    pendingPicks: 0,
    lowStockItems: 0,
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const [posRes, receiptsRes, ordersRes, stockRes] = await Promise.all([
        api.get("/warehouse/purchase-orders?status=CONFIRMED"),
        api.get("/warehouse/goods-receipt"),
        api.get("/orders?status=PENDING"),
        api.get("/warehouse/inventory/low-stock"),
      ]);

      setStats({
        pendingPOs: posRes.data.total || 0,
        todayReceipts: receiptsRes.data.total || 0,
        pendingPicks: ordersRes.data.total || 0,
        lowStockItems: stockRes.data.total || 0,
      });

      // Fetch recent activities (Stock Movements)
      const movementsRes = await api.get("/warehouse/stock-movements?limit=10");
      setRecentActivities(movementsRes.data.movements || []);

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
    {
      title: "Kiểm Kê",
      description: "Kiểm tra tồn kho định kỳ",
      icon: ClipboardList,
      color: "bg-orange-500",
      link: "/warehouse-staff/cycle-count",
    },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case "INBOUND":
        return <TruckIcon className="w-4 h-4 text-blue-500" />;
      case "OUTBOUND":
        return <Package className="w-4 h-4 text-green-500" />;
      case "TRANSFER":
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case "ADJUSTMENT":
        return <ClipboardList className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityLabel = (type) => {
    const labels = {
      INBOUND: "Nhập kho",
      OUTBOUND: "Xuất kho",
      TRANSFER: "Chuyển kho",
      ADJUSTMENT: "Điều chỉnh",
    };
    return labels[type] || type;
  };

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
            <Link to="/warehouse-staff/purchase-orders">
              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                Xem chi tiết →
              </Button>
            </Link>
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
            <Link to="/warehouse-staff/goods-receipt">
              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                Xem lịch sử →
              </Button>
            </Link>
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
                <p className="text-sm text-gray-600">Sản Phẩm Sắp Hết</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.lowStockItems}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <Link to="/warehouse-staff/inventory">
              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                Xem chi tiết →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tác Vụ Nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hoạt Động Gần Đây</span>
            <Link to="/warehouse-staff/activities">
              <Button variant="outline" size="sm">
                Xem tất cả
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Chưa có hoạt động nào</p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">
                        {getActivityLabel(activity.type)} - {activity.productName}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {activity.quantity} chiếc
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span>SKU: {activity.sku}</span>
                      {activity.toLocationCode && (
                        <>
                          <span>•</span>
                          <span>Vị trí: {activity.toLocationCode}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <span>{activity.performedByName}</span>
                      <span>•</span>
                      <span>{new Date(activity.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehouseStaffDashboard;
