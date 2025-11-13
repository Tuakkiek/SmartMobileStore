// ============================================
// FILE: src/pages/admin/AdminDashboard.jsx
// ============================================
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { orderAPI, userAPI } from "@/lib/api";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalEmployees: 0,
    totalRevenue: 0,
    recentOrders: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent orders (limit 10) and total orders
      const ordersRes = await orderAPI.getAll({ limit: 10 });
      const orders = ordersRes?.data?.data?.orders || [];
      const totalOrders = ordersRes?.data?.data?.total || 0;

      // Fetch all delivered orders for revenue (use high limit to get all)
      const deliveredRes = await orderAPI.getAll({
        status: "DELIVERED",
        limit: 10000,
      });
      const deliveredOrders = deliveredRes?.data?.data?.orders || [];
      const revenue = deliveredOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );

      // Fetch product counts from each category (use limit=1 for paginated APIs to get total without full data)
      const [
        iphonesRes,
        ipadsRes,
        macsRes,
        airpodsRes,
        applewatchesRes,
        accessoriesRes,
      ] = await Promise.all([
        iPhoneAPI.getAll({ limit: 1 }),
        iPadAPI.getAll({ limit: 1 }),
        macAPI.getAll({}), // No limit for mac since it ignores pagination and returns all
        airPodsAPI.getAll({ limit: 1 }),
        appleWatchAPI.getAll({ limit: 1 }),
        accessoryAPI.getAll({ limit: 1 }),
      ]);

      const totalProducts =
        (iphonesRes?.data?.data?.total || 0) +
        (ipadsRes?.data?.data?.total || 0) +
        (macsRes?.data?.length || 0) + // Mac returns array, so use length for total
        (airpodsRes?.data?.data?.total || 0) +
        (applewatchesRes?.data?.data?.total || 0) +
        (accessoriesRes?.data?.data?.total || 0);

      // Fetch employees
      const employeesRes = await userAPI.getAllEmployees();
      const totalEmployees = employeesRes?.data?.data?.employees?.length || 0;

      setStats({
        totalOrders,
        totalProducts,
        totalEmployees,
        totalRevenue: revenue,
        recentOrders: orders.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "Tổng đơn hàng",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Tổng sản phẩm",
      value: stats.totalProducts,
      icon: Package,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "Nhân viên",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Doanh thu",
      value: formatPrice(stats.totalRevenue),
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Chào mừng quay trở lại! Đây là tổng quan hệ thống.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentOrders.map((order) => (
              <div
                key={order._id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">#{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customerId?.fullName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatPrice(order.totalAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
