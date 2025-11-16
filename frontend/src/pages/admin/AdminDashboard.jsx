import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  AlertCircle,
  TrendingDown,
  Eye,
  Star,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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

// Chart color palette
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
  indigo: "#6366f1",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.purple,
  COLORS.pink,
];

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalEmployees: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    lowStockProducts: 0,
    avgOrderValue: 0,
    todayRevenue: 0,
    recentOrders: [],
    topProducts: [],
    categoryDistribution: [],
    revenueByMonth: [],
    ordersByStatus: [],
    salesTrend: [],
    productPerformance: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7days");

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Parallel API calls for better performance
      const [
        ordersRes,
        deliveredRes,
        employeesRes,
        iphonesRes,
        ipadsRes,
        macsRes,
        airpodsRes,
        applewatchesRes,
        accessoriesRes,
      ] = await Promise.all([
        orderAPI.getAll({ limit: 100 }),
        orderAPI.getAll({ status: "DELIVERED", limit: 1000 }),
        userAPI.getAllEmployees(),
        iPhoneAPI.getAll({ limit: 100 }),
        iPadAPI.getAll({ limit: 100 }),
        macAPI.getAll({}),
        airPodsAPI.getAll({ limit: 100 }),
        appleWatchAPI.getAll({ limit: 100 }),
        accessoryAPI.getAll({ limit: 100 }),
      ]);

      const orders = ordersRes?.data?.data?.orders || [];
      const totalOrders = ordersRes?.data?.data?.total || 0;
      const deliveredOrders = deliveredRes?.data?.data?.orders || [];

      // Calculate revenue metrics
      const totalRevenue = deliveredOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRevenue = deliveredOrders
        .filter((order) => new Date(order.createdAt) >= today)
        .reduce((sum, order) => sum + order.totalAmount, 0);

      const avgOrderValue =
        deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

      // Order status breakdown
      const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
      const completedOrders = orders.filter(
        (o) => o.status === "DELIVERED"
      ).length;
      const cancelledOrders = orders.filter(
        (o) => o.status === "CANCELLED"
      ).length;

      // Product data aggregation
      const allProducts = [
        ...(iphonesRes?.data?.data?.products || []),
        ...(ipadsRes?.data?.data?.products || []),
        ...(macsRes?.data || []),
        ...(airpodsRes?.data?.data?.products || []),
        ...(applewatchesRes?.data?.data?.products || []),
        ...(accessoriesRes?.data?.data?.products || []),
      ];

      const totalProducts = allProducts.length;

      // Low stock products (products with variants having stock < 10)
      const lowStockProducts = allProducts.filter((product) => {
        const variants = product.variants || [];
        return variants.some((v) => v.stock < 10);
      }).length;

      // Category distribution
      const categoryDistribution = [
        {
          name: "iPhone",
          value: iphonesRes?.data?.data?.total || 0,
          revenue: deliveredOrders
            .flatMap((o) => o.items)
            .filter((item) => item.productType === "iPhone")
            .reduce((sum, item) => sum + item.total, 0),
        },
        {
          name: "iPad",
          value: ipadsRes?.data?.data?.total || 0,
          revenue: deliveredOrders
            .flatMap((o) => o.items)
            .filter((item) => item.productType === "iPad")
            .reduce((sum, item) => sum + item.total, 0),
        },
        {
          name: "Mac",
          value: macsRes?.data?.length || 0,
          revenue: deliveredOrders
            .flatMap((o) => o.items)
            .filter((item) => item.productType === "Mac")
            .reduce((sum, item) => sum + item.total, 0),
        },
        {
          name: "AirPods",
          value: airpodsRes?.data?.data?.total || 0,
          revenue: deliveredOrders
            .flatMap((o) => o.items)
            .filter((item) => item.productType === "AirPods")
            .reduce((sum, item) => sum + item.total, 0),
        },
        {
          name: "Apple Watch",
          value: applewatchesRes?.data?.data?.total || 0,
          revenue: deliveredOrders
            .flatMap((o) => o.items)
            .filter((item) => item.productType === "AppleWatch")
            .reduce((sum, item) => sum + item.total, 0),
        },
        {
          name: "Accessories",
          value: accessoriesRes?.data?.data?.total || 0,
          revenue: deliveredOrders
            .flatMap((o) => o.items)
            .filter((item) => item.productType === "Accessory")
            .reduce((sum, item) => sum + item.total, 0),
        },
      ];

      // Revenue by month (last 6 months)
      const revenueByMonth = generateRevenueByMonth(deliveredOrders);

      // Orders by status
      const ordersByStatus = [
        { name: "Chờ xác nhận", value: pendingOrders, color: COLORS.warning },
        { name: "Đã giao", value: completedOrders, color: COLORS.success },
        { name: "Đã hủy", value: cancelledOrders, color: COLORS.danger },
        {
          name: "Đang xử lý",
          value: orders.filter(
            (o) => o.status === "CONFIRMED" || o.status === "SHIPPING"
          ).length,
          color: COLORS.primary,
        },
      ];

      // Sales trend (last 30 days)
      const salesTrend = generateSalesTrend(deliveredOrders);

      // Top products by revenue
      const productRevenue = new Map();
      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          const key = item.productName;
          productRevenue.set(key, (productRevenue.get(key) || 0) + item.total);
        });
      });

      const topProducts = Array.from(productRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, revenue]) => ({ name, revenue }));

      // Product performance metrics
      const productPerformance = allProducts
        .map((p) => ({
          name: p.name,
          salesCount: p.salesCount || 0,
          rating: p.averageRating || 0,
          reviews: p.totalReviews || 0,
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 10);

      setStats({
        totalOrders,
        totalProducts,
        totalEmployees: employeesRes?.data?.data?.employees?.length || 0,
        totalRevenue,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        lowStockProducts,
        avgOrderValue,
        todayRevenue,
        recentOrders: orders.slice(0, 5),
        topProducts,
        categoryDistribution,
        revenueByMonth,
        ordersByStatus,
        salesTrend,
        productPerformance,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate revenue data by month
  const generateRevenueByMonth = (orders) => {
    const monthlyData = {};
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      monthlyData[key] = 0;
      months.push({
        key,
        name: date.toLocaleDateString("vi-VN", {
          month: "short",
          year: "numeric",
        }),
      });
    }

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += order.totalAmount;
      }
    });

    return months.map((m) => ({
      name: m.name,
      revenue: monthlyData[m.key],
    }));
  };

  // Generate sales trend (last 30 days)
  const generateSalesTrend = (orders) => {
    const dailyData = {};
    const days = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      dailyData[key] = { orders: 0, revenue: 0 };
      days.push({
        key,
        name: date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
      });
    }

    orders.forEach((order) => {
      const key = new Date(order.createdAt).toISOString().split("T")[0];
      if (dailyData[key]) {
        dailyData[key].orders += 1;
        dailyData[key].revenue += order.totalAmount;
      }
    });

    return days.map((d) => ({
      name: d.name,
      orders: dailyData[d.key].orders,
      revenue: dailyData[d.key].revenue,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Main stat cards
  const statCards = [
    {
      title: "Tổng doanh thu",
      value: formatPrice(stats.totalRevenue),
      change: "+12.5%",
      changeType: "increase",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "Đơn hàng",
      value: stats.totalOrders,
      subValue: `${stats.pendingOrders} chờ xử lý`,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Sản phẩm",
      value: stats.totalProducts,
      subValue: `${stats.lowStockProducts} sắp hết`,
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Giá trị TB/Đơn",
      value: formatPrice(stats.avgOrderValue),
      change: "+8.2%",
      changeType: "increase",
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  // Quick stats
  const quickStats = [
    {
      label: "Doanh thu hôm nay",
      value: formatPrice(stats.todayRevenue),
      icon: Clock,
      color: "text-blue-600",
    },
    {
      label: "Đơn hoàn thành",
      value: stats.completedOrders,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Đơn bị hủy",
      value: stats.cancelledOrders,
      icon: XCircle,
      color: "text-red-600",
    },
    {
      label: "Sản phẩm sắp hết",
      value: stats.lowStockProducts,
      icon: AlertCircle,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Tổng quan</h1>
          <p className="text-muted-foreground">
            Phân tích chi tiết về hoạt động kinh doanh
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7days">7 ngày qua</option>
          <option value="30days">30 ngày qua</option>
          <option value="3months">3 tháng qua</option>
          <option value="1year">1 năm qua</option>
        </select>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  {stat.change && (
                    <span
                      className={`text-sm font-medium ${
                        stat.changeType === "increase"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
                {stat.subValue && (
                  <p className="text-xs text-muted-foreground">
                    {stat.subValue}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Revenue & Sales Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={COLORS.primary}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value) => formatPrice(value)}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Trend (30 days) */}
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng bán hàng (30 ngày)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Đơn hàng"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  name="Doanh thu"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Category & Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ sản phẩm theo danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {stats.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-orange-500"
                          : "bg-gray-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <p className="font-medium text-sm">{product.name}</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">
                    {formatPrice(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                      {order.shippingAddress?.fullName || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPrice(order.totalAmount)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        order.status === "DELIVERED"
                          ? "bg-green-100 text-green-800"
                          : order.status === "CANCELLED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất sản phẩm</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.productPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="salesCount" fill={COLORS.primary} name="Lượt bán" />
              <Bar dataKey="reviews" fill={COLORS.warning} name="Đánh giá" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Revenue Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>So sánh doanh thu theo danh mục</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.categoryDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(value) => formatPrice(value)}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="revenue"
                fill={COLORS.success}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
