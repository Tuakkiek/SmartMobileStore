// ============================================
// FILE 1: frontend/src/components/admin/dashboard/StatsCards.jsx
// ============================================
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  Gift,
  AlertCircle,
  Box,
} from "lucide-react";

const StatsCards = ({ stats }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const cards = [
    {
      title: "Tổng doanh thu",
      value: formatPrice(stats.totalRevenue),
      // change: `${
      //   stats.revenueGrowth >= 0 ? "+" : ""
      // }${stats.revenueGrowth.toFixed(1)}%`,
      changeType: stats.revenueGrowth >= 0 ? "increase" : "decrease",
      // subValue: `Hôm nay: ${formatPrice(stats.todayRevenue)}`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "Đơn hàng",
      value: stats.totalOrders,
      // change: `${stats.orderGrowth >= 0 ? "+" : ""}${stats.orderGrowth.toFixed(
      //   1
      // )}%`,
      changeType: stats.orderGrowth >= 0 ? "increase" : "decrease",
      subValue: `${stats.pendingOrders} chờ xử lý`,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Sản phẩm",
      value: stats.totalProducts,
      subValue: `${stats.totalVariants} biến thể`,
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Đánh giá TB",
      value: stats.avgRating.toFixed(1),
      subValue: `${stats.totalReviews || 0} đánh giá`,
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      title: "Tồn kho",
      value: stats.totalStock.toLocaleString(),
      subValue: `${stats.lowStockProducts} sắp hết`,
      icon: Box,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      title: "Giá trị kho",
      value: formatPrice(stats.inventoryValue),
      subValue: `${stats.outOfStockProducts} hết hàng`,
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      title: "Khuyến mãi",
      value: stats.promotions?.length || 0,
      subValue: `${stats.activePromotions} đang hoạt động`,
      icon: Gift,
      color: "text-pink-600",
      bg: "bg-pink-100",
    },
    {
      title: "Nhân viên",
      value: stats.totalEmployees,
      subValue: `Đang làm việc`,
      icon: Users,
      color: "text-cyan-600",
      bg: "bg-cyan-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
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
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              {stat.subValue && (
                <p className="text-xs text-muted-foreground">{stat.subValue}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
