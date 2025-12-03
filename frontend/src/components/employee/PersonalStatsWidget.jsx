import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { Package } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const PersonalStatsWidget = ({ userRole }) => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("today");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await axios.get(
        `${BASE_URL}/analytics/employee/personal`,
        {
          params: { period },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStats(response.data.data);
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const periodLabels = {
    today: "Hôm nay",
    week: "Tuần này",
    month: "Tháng này",
    year: "Năm nay",
  };

  // Tính tổng đơn đã hoàn thành theo role
  const getCompletedOrders = () => {
    if (!stats) return 0;

    switch (userRole) {
      case "POS_STAFF":
        return stats.pos?.orders || 0;
      case "SHIPPER":
        return stats.shipper?.delivered || 0;
      case "CASHIER":
        return stats.cashier?.transactions || 0;
      default:
        return 0;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case "POS_STAFF":
        return "Đơn hàng đã tạo";
      case "SHIPPER":
        return "Đơn đã giao thành công";
      case "CASHIER":
        return "Giao dịch đã xử lý";
      default:
        return "Đơn đã hoàn thành";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Dropdown chọn khoảng thời gian */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Số liệu */}
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">
              {getRoleLabel()}
            </p>
            <p className="text-3xl font-bold text-primary">
              {getCompletedOrders()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalStatsWidget;
