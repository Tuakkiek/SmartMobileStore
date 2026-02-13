import { useState, useEffect } from "react";
import axios from "axios";
import {
  orderAPI,
  userAPI,
  promotionAPI,
  universalProductAPI,
} from "@/lib/api";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const toNumber = (value) => Number(value || 0);

const normalizeKey = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const getProductCategoryName = (product) => {
  const type = product?.productType;
  if (typeof type === "object") {
    return type?.name || type?.slug || product?.category || "Product";
  }
  return type || product?.category || "Product";
};

export const useDashboardData = (timeRange) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(timeRange);

      const [
        ordersRes,
        deliveredRes,
        employeesRes,
        productsRes,
        promotionsRes,
        employeeKPIRes,
      ] = await Promise.all([
        orderAPI.getAll({ limit: 1000, startDate, endDate }),
        orderAPI.getAll({
          status: "DELIVERED",
          limit: 2000,
          startDate,
          endDate,
        }),
        userAPI.getAllEmployees(),
        universalProductAPI.getAll({ limit: 1000 }),
        promotionAPI.getAllPromotions(),
        axios.get(`${BASE_URL}/analytics/employee/kpi`, {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const processedStats = processAllData({
        ordersRes,
        deliveredRes,
        employeesRes,
        productsRes,
        promotionsRes,
        timeRange,
        employeeKPI: employeeKPIRes?.data?.data || {},
      });

      setStats(processedStats);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err?.response?.data?.message || "Loi khi tai du lieu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  return { stats, isLoading, error, refetch: fetchData };
};

const getDateRange = (timeRange) => {
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);

  switch (timeRange) {
    case "7days":
      startDate.setDate(startDate.getDate() - 6);
      break;
    case "30days":
      startDate.setDate(startDate.getDate() - 29);
      break;
    case "3months":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "1year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 29);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

const getToken = () => {
  const authStorage = localStorage.getItem("auth-storage");
  if (!authStorage) return null;

  try {
    const { state } = JSON.parse(authStorage);
    return state?.token || null;
  } catch {
    return null;
  }
};

const processAllData = ({
  ordersRes,
  deliveredRes,
  employeesRes,
  productsRes,
  promotionsRes,
  timeRange,
  employeeKPI,
}) => {
  const { startDate, endDate } = getDateRange(timeRange);

  const orders =
    ordersRes?.data?.data?.orders || ordersRes?.data?.orders || [];
  const deliveredOrders =
    deliveredRes?.data?.data?.orders || deliveredRes?.data?.orders || [];

  const totalOrders =
    ordersRes?.data?.data?.total ||
    ordersRes?.data?.pagination?.total ||
    orders.length;

  const allProducts =
    productsRes?.data?.data?.products || productsRes?.data?.products || [];

  const filteredOrders = orders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
  });

  const filteredDelivered = deliveredOrders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
  });

  const totalRevenue = filteredDelivered.reduce(
    (sum, order) => sum + toNumber(order.totalAmount ?? order.total),
    0
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRevenue = filteredDelivered
    .filter((order) => new Date(order.createdAt) >= today)
    .reduce((sum, order) => sum + toNumber(order.totalAmount ?? order.total), 0);

  const avgOrderValue =
    filteredDelivered.length > 0 ? totalRevenue / filteredDelivered.length : 0;

  const pendingOrders = filteredOrders.filter(
    (order) => order.status === "PENDING"
  ).length;
  const completedOrders = filteredDelivered.length;
  const cancelledOrders = filteredOrders.filter(
    (order) => order.status === "CANCELLED"
  ).length;

  let totalStock = 0;
  let totalVariants = 0;
  let inventoryValue = 0;
  let totalRatings = 0;
  let ratedProducts = 0;
  let totalReviews = 0;

  const productIdToCategory = new Map();
  const categoryStatsMap = new Map();

  for (const product of allProducts) {
    const productId = String(product?._id || "");
    const categoryName = getProductCategoryName(product);
    const categoryKey = normalizeKey(categoryName);
    if (productId) {
      productIdToCategory.set(productId, categoryName);
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const productStock = variants.reduce(
      (sum, variant) => sum + toNumber(variant.stock),
      0
    );
    const productValue = variants.reduce(
      (sum, variant) => sum + toNumber(variant.price) * toNumber(variant.stock),
      0
    );

    totalVariants += variants.length;
    totalStock += productStock;
    inventoryValue += productValue;
    totalReviews += toNumber(product.totalReviews);

    if (toNumber(product.averageRating) > 0) {
      totalRatings += toNumber(product.averageRating);
      ratedProducts += 1;
    }

    if (!categoryStatsMap.has(categoryKey)) {
      categoryStatsMap.set(categoryKey, {
        name: categoryName,
        key: categoryKey,
        products: 0,
        stock: 0,
        value: 0,
        revenue: 0,
      });
    }

    const categoryStats = categoryStatsMap.get(categoryKey);
    categoryStats.products += 1;
    categoryStats.stock += productStock;
    categoryStats.value += productValue;
  }

  const avgRating = ratedProducts > 0 ? totalRatings / ratedProducts : 0;

  const lowStockProducts = allProducts.filter((product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    return variants.some((variant) => toNumber(variant.stock) > 0 && toNumber(variant.stock) < 10);
  }).length;

  const outOfStockProducts = allProducts.filter((product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    return variants.length > 0 && variants.every((variant) => toNumber(variant.stock) === 0);
  }).length;

  for (const order of filteredDelivered) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const productId =
        typeof item.productId === "object"
          ? String(item.productId?._id || item.productId)
          : String(item.productId || "");

      const fallbackCategory = item.productType || "Product";
      const categoryName = productIdToCategory.get(productId) || fallbackCategory;
      const categoryKey = normalizeKey(categoryName);

      if (!categoryStatsMap.has(categoryKey)) {
        categoryStatsMap.set(categoryKey, {
          name: categoryName,
          key: categoryKey,
          products: 0,
          stock: 0,
          value: 0,
          revenue: 0,
        });
      }

      const categoryStats = categoryStatsMap.get(categoryKey);
      categoryStats.revenue += toNumber(item.total);
    }
  }

  const categoryStock = Array.from(categoryStatsMap.values()).sort(
    (a, b) => b.products - a.products
  );

  const categoryRevenue = categoryStock.map((category) => ({
    ...category,
    revenue: toNumber(category.revenue),
  }));

  const categoryDistribution = categoryStock.map((category) => ({
    name: category.name,
    value: category.products,
    revenue: category.revenue,
  }));

  const promotions = promotionsRes?.data?.data?.promotions || [];
  const now = new Date();

  const activePromotions = promotions.filter((promotion) => {
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);
    return now >= start && now <= end && promotion.usedCount < promotion.usageLimit;
  }).length;

  const usedPromotions = promotions.reduce(
    (sum, promotion) => sum + toNumber(promotion.usedCount),
    0
  );

  const topPromotions = [...promotions]
    .sort((a, b) => toNumber(b.usedCount) - toNumber(a.usedCount))
    .slice(0, 10)
    .map((promotion) => ({
      name: promotion.name,
      code: promotion.code,
      used: toNumber(promotion.usedCount),
      limit: toNumber(promotion.usageLimit),
      discount:
        promotion.discountType === "PERCENTAGE"
          ? `${promotion.discountValue}%`
          : `${toNumber(promotion.discountValue).toLocaleString()}d`,
    }));

  const bestSellingProducts = [...allProducts]
    .filter((product) => toNumber(product.salesCount) > 0)
    .sort((a, b) => toNumber(b.salesCount) - toNumber(a.salesCount))
    .slice(0, 20)
    .map((product) => ({
      name: product.name,
      sales: toNumber(product.salesCount),
      rating: toNumber(product.averageRating),
      reviews: toNumber(product.totalReviews),
      category: getProductCategoryName(product),
    }));

  const productRevenue = new Map();
  for (const order of filteredDelivered) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const key = item.productName || item.name || "Unknown Product";
      productRevenue.set(key, toNumber(productRevenue.get(key)) + toNumber(item.total));
    }
  }

  const topProducts = Array.from(productRevenue.entries())
    .sort((a, b) => toNumber(b[1]) - toNumber(a[1]))
    .slice(0, 10)
    .map(([name, revenue]) => ({ name, revenue }));

  const productPerformance = [...allProducts]
    .map((product) => ({
      name: product.name,
      salesCount: toNumber(product.salesCount),
      rating: toNumber(product.averageRating),
      reviews: toNumber(product.totalReviews),
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 10);

  const last30Days = filteredDelivered.filter((order) => {
    const daysAgo = Math.floor((Date.now() - new Date(order.createdAt)) / 86400000);
    return daysAgo <= 30;
  });

  const previous30Days = filteredDelivered.filter((order) => {
    const daysAgo = Math.floor((Date.now() - new Date(order.createdAt)) / 86400000);
    return daysAgo > 30 && daysAgo <= 60;
  });

  const currentRevenue = last30Days.reduce(
    (sum, order) => sum + toNumber(order.totalAmount ?? order.total),
    0
  );
  const previousRevenue = previous30Days.reduce(
    (sum, order) => sum + toNumber(order.totalAmount ?? order.total),
    0
  );

  const revenueGrowth =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

  const orderGrowth =
    previous30Days.length > 0
      ? ((last30Days.length - previous30Days.length) / previous30Days.length) * 100
      : 0;

  const hourlyOrders = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    orders: filteredOrders.filter(
      (order) => new Date(order.createdAt).getHours() === hour
    ).length,
  }));

  const revenueByMonth = generateRevenueByMonth(filteredDelivered);
  const salesTrend = generateSalesTrend(filteredDelivered);

  const ordersByStatus = [
    { name: "Cho xac nhan", value: pendingOrders, color: "#f59e0b" },
    { name: "Da giao", value: completedOrders, color: "#10b981" },
    { name: "Da huy", value: cancelledOrders, color: "#ef4444" },
    {
      name: "Dang xu ly",
      value: filteredOrders.filter(
        (order) => order.status === "CONFIRMED" || order.status === "SHIPPING"
      ).length,
      color: "#3b82f6",
    },
  ];

  return {
    totalOrders,
    totalProducts: allProducts.length,
    totalEmployees: employeesRes?.data?.data?.employees?.length || 0,
    totalRevenue,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    lowStockProducts,
    avgOrderValue,
    todayRevenue,
    recentOrders: filteredOrders.slice(0, 5),
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
    ...employeeKPI,
  };
};

const generateRevenueByMonth = (orders) => {
  const monthlyData = {};
  const months = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = 0;
    months.push({
      key,
      name: date.toLocaleDateString("vi-VN", {
        month: "short",
        year: "numeric",
      }),
    });
  }

  for (const order of orders) {
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyData[key] !== undefined) {
      monthlyData[key] += toNumber(order.totalAmount ?? order.total);
    }
  }

  return months.map((month) => ({
    name: month.name,
    revenue: monthlyData[month.key],
  }));
};

const generateSalesTrend = (orders) => {
  const dailyData = {};
  const days = [];

  for (let i = 29; i >= 0; i -= 1) {
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

  for (const order of orders) {
    const key = new Date(order.createdAt).toISOString().split("T")[0];
    if (dailyData[key]) {
      dailyData[key].orders += 1;
      dailyData[key].revenue += toNumber(order.totalAmount ?? order.total);
    }
  }

  return days.map((day) => ({
    name: day.name,
    orders: dailyData[day.key].orders,
    revenue: dailyData[day.key].revenue,
  }));
};
