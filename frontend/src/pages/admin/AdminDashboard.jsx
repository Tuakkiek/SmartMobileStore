import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingDown,
  Star,
  Gift,
  Box,
  Percent,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Eye,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";
import { orderAPI, userAPI, promotionAPI } from "@/lib/api";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";

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
    totalStock: 0,
    totalVariants: 0,
    outOfStockProducts: 0,
    promotions: [],
    activePromotions: 0,
    usedPromotions: 0,
    topPromotions: [],
    categoryStock: [],
    revenueGrowth: 0,
    orderGrowth: 0,
    bestSellingProducts: [],
    categoryRevenue: [],
    hourlyOrders: [],
    inventoryValue: 0,
    avgRating: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7days");

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
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
        promotionsRes,
      ] = await Promise.all([
        orderAPI.getAll({ limit: 1000 }),
        orderAPI.getAll({ status: "DELIVERED", limit: 2000 }),
        userAPI.getAllEmployees(),
        iPhoneAPI.getAll({ limit: 1000 }),
        iPadAPI.getAll({ limit: 1000 }),
        macAPI.getAll({ limit: 1000 }),
        airPodsAPI.getAll({ limit: 1000 }),
        appleWatchAPI.getAll({ limit: 1000 }),
        accessoryAPI.getAll({ limit: 1000 }),
        promotionAPI.getAll(),
      ]);

      const orders = ordersRes?.data?.data?.orders || [];
      const totalOrders = ordersRes?.data?.data?.total || 0;
      const deliveredOrders = deliveredRes?.data?.data?.orders || [];

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

      const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
      const completedOrders = orders.filter(
        (o) => o.status === "DELIVERED"
      ).length;
      const cancelledOrders = orders.filter(
        (o) => o.status === "CANCELLED"
      ).length;

      // Safely extract products with fallbacks
      const iPhones = Array.isArray(iphonesRes?.data?.data?.products)
        ? iphonesRes.data.data.products
        : [];
      const iPads = Array.isArray(ipadsRes?.data?.data?.products)
        ? ipadsRes.data.data.products
        : [];
      const macs = Array.isArray(macsRes?.data) ? macsRes.data : [];
      const airPods = Array.isArray(airpodsRes?.data?.data?.products)
        ? airpodsRes.data.data.products
        : [];
      const watches = Array.isArray(applewatchesRes?.data?.data?.products)
        ? applewatchesRes.data.data.products
        : [];
      const accessories = Array.isArray(accessoriesRes?.data?.data?.products)
        ? accessoriesRes.data.data.products
        : [];

      const allProducts = [
        ...iPhones,
        ...iPads,
        ...macs,
        ...airPods,
        ...watches,
        ...accessories,
      ];
      const totalProducts = allProducts.length;

      let totalStock = 0,
        totalVariants = 0,
        inventoryValue = 0;
      let totalRatings = 0,
        ratedProducts = 0;

      allProducts.forEach((product) => {
        const variants = product.variants || [];
        totalVariants += variants.length;

        variants.forEach((v) => {
          totalStock += v.stock || 0;
          inventoryValue += (v.price || 0) * (v.stock || 0);
        });

        if (product.averageRating > 0) {
          totalRatings += product.averageRating;
          ratedProducts++;
        }
      });

      const avgRating = ratedProducts > 0 ? totalRatings / ratedProducts : 0;

      const lowStockProducts = allProducts.filter((product) => {
        const variants = product.variants || [];
        return variants.some((v) => v.stock > 0 && v.stock < 10);
      }).length;

      const outOfStockProducts = allProducts.filter((product) => {
        const variants = product.variants || [];
        return variants.every((v) => v.stock === 0);
      }).length;

      const categoryStock = [
        {
          name: "iPhone",
          products: iphonesRes?.data?.data?.total || 0,
          stock: (iphonesRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
            0
          ),
          value: (iphonesRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum +
              (p.variants || []).reduce(
                (s, v) => s + (v.price || 0) * (v.stock || 0),
                0
              ),
            0
          ),
        },
        {
          name: "iPad",
          products: ipadsRes?.data?.data?.total || 0,
          stock: (ipadsRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
            0
          ),
          value: (ipadsRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum +
              (p.variants || []).reduce(
                (s, v) => s + (v.price || 0) * (v.stock || 0),
                0
              ),
            0
          ),
        },
        {
          name: "Mac",
          products: macsRes?.data?.length || 0,
          stock: (macsRes?.data || []).reduce(
            (sum, p) =>
              sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
            0
          ),
          value: (macsRes?.data || []).reduce(
            (sum, p) =>
              sum +
              (p.variants || []).reduce(
                (s, v) => s + (v.price || 0) * (v.stock || 0),
                0
              ),
            0
          ),
        },
        {
          name: "AirPods",
          products: airpodsRes?.data?.data?.total || 0,
          stock: (airpodsRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
            0
          ),
          value: (airpodsRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum +
              (p.variants || []).reduce(
                (s, v) => s + (v.price || 0) * (v.stock || 0),
                0
              ),
            0
          ),
        },
        {
          name: "Watch",
          products: applewatchesRes?.data?.data?.total || 0,
          stock: (applewatchesRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
            0
          ),
          value: (applewatchesRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum +
              (p.variants || []).reduce(
                (s, v) => s + (v.price || 0) * (v.stock || 0),
                0
              ),
            0
          ),
        },
        {
          name: "Phụ kiện",
          products: accessoriesRes?.data?.data?.total || 0,
          stock: (accessoriesRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
            0
          ),
          value: (accessoriesRes?.data?.data?.products || []).reduce(
            (sum, p) =>
              sum +
              (p.variants || []).reduce(
                (s, v) => s + (v.price || 0) * (v.stock || 0),
                0
              ),
            0
          ),
        },
      ];

      const promotions = promotionsRes?.data?.data?.promotions || [];
      const now = new Date();

      const activePromotions = promotions.filter((p) => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return now >= start && now <= end && p.usedCount < p.usageLimit;
      }).length;

      const usedPromotions = promotions.reduce(
        (sum, p) => sum + (p.usedCount || 0),
        0
      );

      const topPromotions = [...promotions]
        .sort((a, b) => b.usedCount - a.usedCount)
        .slice(0, 10)
        .map((p) => ({
          name: p.name,
          code: p.code,
          used: p.usedCount,
          limit: p.usageLimit,
          discount:
            p.discountType === "PERCENTAGE"
              ? `${p.discountValue}%`
              : formatPrice(p.discountValue),
        }));

      const bestSellingProducts = [...allProducts]
        .filter((p) => p.salesCount > 0)
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 20)
        .map((p) => ({
          name: p.name,
          sales: p.salesCount || 0,
          rating: p.averageRating || 0,
          reviews: p.totalReviews || 0,
          category: p.category,
        }));

      const categoryRevenue = categoryStock.map((cat) => {
        const revenue = deliveredOrders
          .flatMap((o) => o.items)
          .filter((item) => {
            if (cat.name === "Watch") return item.productType === "AppleWatch";
            if (cat.name === "Phụ kiện")
              return item.productType === "Accessory";
            return item.productType === cat.name;
          })
          .reduce((sum, item) => sum + item.total, 0);

        return { ...cat, revenue };
      });

      const categoryDistribution = categoryRevenue.map((cat) => ({
        name: cat.name,
        value: cat.products,
        revenue: cat.revenue,
      }));

      const last30Days = deliveredOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        return daysAgo <= 30;
      });

      const previous30Days = deliveredOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        return daysAgo > 30 && daysAgo <= 60;
      });

      const currentRevenue = last30Days.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );
      const previousRevenue = previous30Days.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );

      const revenueGrowth =
        previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : 0;

      const orderGrowth =
        previous30Days.length > 0
          ? ((last30Days.length - previous30Days.length) /
              previous30Days.length) *
            100
          : 0;

      const hourlyOrders = Array.from({ length: 24 }, (_, hour) => {
        const count = orders.filter((o) => {
          const orderHour = new Date(o.createdAt).getHours();
          return orderHour === hour;
        }).length;
        return { hour: `${hour}:00`, orders: count };
      });

      const revenueByMonth = generateRevenueByMonth(deliveredOrders);
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

      const salesTrend = generateSalesTrend(deliveredOrders);

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
        totalStock,
        totalVariants,
        outOfStockProducts,
        promotions,
        activePromotions,
        usedPromotions,
        topPromotions,
        categoryStock,
        revenueGrowth,
        orderGrowth,
        bestSellingProducts,
        categoryRevenue,
        hourlyOrders,
        inventoryValue,
        avgRating,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

    return months.map((m) => ({ name: m.name, revenue: monthlyData[m.key] }));
  };

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

  const statCards = [
    {
      title: "Tổng doanh thu",
      value: formatPrice(stats.totalRevenue),
      change: `${
        stats.revenueGrowth >= 0 ? "+" : ""
      }${stats.revenueGrowth.toFixed(1)}%`,
      changeType: stats.revenueGrowth >= 0 ? "increase" : "decrease",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "Đơn hàng",
      value: stats.totalOrders,
      change: `${stats.orderGrowth >= 0 ? "+" : ""}${stats.orderGrowth.toFixed(
        1
      )}%`,
      changeType: stats.orderGrowth >= 0 ? "increase" : "decrease",
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
      title: "Đánh giá TB",
      value: stats.avgRating.toFixed(1),
      subValue: `${stats.totalVariants} biến thể`,
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
  ];

  return (
    <div className="space-y-6 p-6">
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
                      className={`text-sm font-medium flex items-center gap-1 ${
                        stat.changeType === "increase"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stat.changeType === "increase" ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Box className="w-4 h-4 mr-2" />
            Kho hàng
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Bán hàng
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Sản phẩm
          </TabsTrigger>
          <TabsTrigger value="promotions">
            <Gift className="w-4 h-4 mr-2" />
            Khuyến mãi
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Doanh thu 6 tháng</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.revenueByMonth}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                      tickFormatter={(value) =>
                        `${(value / 1000000).toFixed(0)}M`
                      }
                    />
                    <Tooltip formatter={(value) => formatPrice(value)} />
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

            <Card>
              <CardHeader>
                <CardTitle>Xu hướng bán hàng 30 ngày</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={stats.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="orders"
                      fill={COLORS.primary}
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
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ sản phẩm</CardTitle>
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
                    <Tooltip />
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
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dưới 10 sản phẩm
                    </p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hết hàng</p>
                    <h3 className="text-2xl font-bold text-red-600">
                      {stats.outOfStockProducts}
                    </h3>
                  </div>
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tồn kho theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.categoryStock}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="stock"
                      fill={COLORS.primary}
                      name="Số lượng"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Giá trị kho theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.categoryStock}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name}: ${formatPrice(value)}`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.categoryStock.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatPrice(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chi tiết tồn kho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Danh mục</th>
                      <th className="text-right p-3">Sản phẩm</th>
                      <th className="text-right p-3">Tồn kho</th>
                      <th className="text-right p-3">Giá trị</th>
                      <th className="text-right p-3">TB/SP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.categoryStock.map((cat, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{cat.name}</td>
                        <td className="text-right p-3">{cat.products}</td>
                        <td className="text-right p-3">
                          {cat.stock.toLocaleString()}
                        </td>
                        <td className="text-right p-3">
                          {formatPrice(cat.value)}
                        </td>
                        <td className="text-right p-3">
                          {cat.products > 0
                            ? formatPrice(cat.value / cat.products)
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES TAB */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Doanh thu theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.categoryRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) =>
                        `${(value / 1000000).toFixed(0)}M`
                      }
                    />
                    <Tooltip formatter={(value) => formatPrice(value)} />
                    <Bar
                      dataKey="revenue"
                      fill={COLORS.success}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 sản phẩm bán chạy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng theo giờ trong ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.hourlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                      <Badge
                        className={
                          order.status === "DELIVERED"
                            ? "bg-green-100 text-green-800"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 20 sản phẩm bán chạy nhất</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stats.bestSellingProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="sales"
                      fill={COLORS.primary}
                      name="Lượt bán"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hiệu suất sản phẩm</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={stats.productPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="salesCount"
                      fill={COLORS.primary}
                      name="Lượt bán"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rating"
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      name="Đánh giá"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chi tiết sản phẩm bán chạy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">STT</th>
                      <th className="text-left p-3">Tên sản phẩm</th>
                      <th className="text-center p-3">Danh mục</th>
                      <th className="text-right p-3">Lượt bán</th>
                      <th className="text-right p-3">Đánh giá</th>
                      <th className="text-right p-3">Số review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bestSellingProducts.map((product, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${
                              idx === 0
                                ? "bg-yellow-500"
                                : idx === 1
                                ? "bg-gray-400"
                                : idx === 2
                                ? "bg-orange-500"
                                : "bg-gray-300"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{product.name}</td>
                        <td className="text-center p-3">
                          <Badge variant="outline">{product.category}</Badge>
                        </td>
                        <td className="text-right p-3 font-bold">
                          {product.sales.toLocaleString()}
                        </td>
                        <td className="text-right p-3">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{product.rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="text-right p-3">{product.reviews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMOTIONS TAB */}
        <TabsContent value="promotions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng mã KM</p>
                    <h3 className="text-2xl font-bold">
                      {stats.promotions.length}
                    </h3>
                  </div>
                  <Gift className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Đang hoạt động
                    </p>
                    <h3 className="text-2xl font-bold text-green-600">
                      {stats.activePromotions}
                    </h3>
                  </div>
                  <Activity className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Lượt sử dụng
                    </p>
                    <h3 className="text-2xl font-bold">
                      {stats.usedPromotions}
                    </h3>
                  </div>
                  <CheckCircle className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 mã khuyến mãi được dùng nhiều nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">STT</th>
                      <th className="text-left p-3">Tên mã</th>
                      <th className="text-center p-3">Code</th>
                      <th className="text-center p-3">Giảm giá</th>
                      <th className="text-right p-3">Đã dùng</th>
                      <th className="text-right p-3">Giới hạn</th>
                      <th className="text-right p-3">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPromotions.map((promo, idx) => {
                      const percentage = (promo.used / promo.limit) * 100;
                      return (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{promo.name}</td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="font-mono">
                              {promo.code}
                            </Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge className="bg-green-100 text-green-800">
                              {promo.discount}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-bold">
                            {promo.used}
                          </td>
                          <td className="text-right p-3">{promo.limit}</td>
                          <td className="text-right p-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    percentage >= 80
                                      ? "bg-red-500"
                                      : percentage >= 50
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {stats.topPromotions.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Gift className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Chưa có mã khuyến mãi nào được sử dụng
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
