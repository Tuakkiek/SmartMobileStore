// frontend/src/hooks/useDashboardData.js
import { useState, useEffect } from "react";
import {
  orderAPI,
  userAPI,
  promotionAPI,
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

export const useDashboardData = (timeRange) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel .
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

      // Process data
      const processedStats = processAllData({
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
        timeRange,
      });

      setStats(processedStats);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.message || "Lỗi khi tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  return { stats, isLoading, error, refetch: fetchData };
};

// Helper function to process all data
const processAllData = ({
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
  timeRange,
}) => {
  const orders = ordersRes?.data?.data?.orders || [];
  const totalOrders = ordersRes?.data?.data?.total || 0;
  const deliveredOrders = deliveredRes?.data?.data?.orders || [];

  // Calculate revenue
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

  // Order status
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;

  // Products
  const iPhones = Array.isArray(iphonesRes?.data?.data?.products)
    ? iphonesRes.data.data.products
    : [];
  const iPads = Array.isArray(ipadsRes?.data?.data?.products)
    ? ipadsRes.data.data.products
    : [];
  const macs = Array.isArray(macsRes?.data?.data?.products)
    ? macsRes.data.data.products
    : Array.isArray(macsRes?.data)
    ? macsRes.data
    : [];
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

  // Stock and inventory
  let totalStock = 0,
    totalVariants = 0,
    inventoryValue = 0;
  let totalRatings = 0,
    ratedProducts = 0,
    totalReviews = 0;

  allProducts.forEach((product) => {
    const variants = product.variants || [];
    totalVariants += variants.length;
    totalReviews += product.totalReviews || 0;

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

  // Category stock
  const categoryStock = [
    {
      name: "iPhone",
      products: iphonesRes?.data?.data?.total || 0,
      stock: iPhones.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: iPhones.reduce(
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
      stock: iPads.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: iPads.reduce(
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
      products: macsRes?.data?.data?.total || macsRes?.data?.length || 0,
      stock: macs.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: macs.reduce(
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
      stock: airPods.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: airPods.reduce(
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
      stock: watches.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: watches.reduce(
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
      stock: accessories.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: accessories.reduce(
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

  // Promotions
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
          : `${p.discountValue.toLocaleString()}₫`,
    }));

  // Best selling products
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

  // Category revenue
  const categoryRevenue = categoryStock.map((cat) => {
    const revenue = deliveredOrders
      .flatMap((o) => o.items)
      .filter((item) => {
        if (cat.name === "Watch") return item.productType === "AppleWatch";
        if (cat.name === "Phụ kiện") return item.productType === "Accessory";
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

  // Growth calculations
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

  const currentRevenue = last30Days.reduce((sum, o) => sum + o.totalAmount, 0);
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
      ? ((last30Days.length - previous30Days.length) / previous30Days.length) *
        100
      : 0;

  // Hourly orders
  const hourlyOrders = Array.from({ length: 24 }, (_, hour) => {
    const count = orders.filter((o) => {
      const orderHour = new Date(o.createdAt).getHours();
      return orderHour === hour;
    }).length;
    return { hour: `${hour}:00`, orders: count };
  });

  // Revenue by month
  const revenueByMonth = generateRevenueByMonth(deliveredOrders);

  // Orders by status
  const ordersByStatus = [
    { name: "Chờ xác nhận", value: pendingOrders, color: "#f59e0b" },
    { name: "Đã giao", value: completedOrders, color: "#10b981" },
    { name: "Đã hủy", value: cancelledOrders, color: "#ef4444" },
    {
      name: "Đang xử lý",
      value: orders.filter(
        (o) => o.status === "CONFIRMED" || o.status === "SHIPPING"
      ).length,
      color: "#3b82f6",
    },
  ];

  // Sales trend
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

  // Product performance
  const productPerformance = allProducts
    .map((p) => ({
      name: p.name,
      salesCount: p.salesCount || 0,
      rating: p.averageRating || 0,
      reviews: p.totalReviews || 0,
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 10);

  return {
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
    totalReviews,
  };
};

// Generate revenue by month
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

// Generate sales trend
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
