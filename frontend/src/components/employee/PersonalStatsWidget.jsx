import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { Package, TrendingUp, Award, DollarSign } from "lucide-react";

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

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const periodLabels = {
    today: "Hôm nay",
    week: "Tuần này",
    month: "Tháng này",
    year: "Năm nay",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2">
        {Object.keys(periodLabels).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === p
                ? "bg-primary text-white"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* POS Staff Stats */}
        {userRole === "POS_STAFF" && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Đơn hàng đã tạo
                </h3>
                <p className="text-3xl font-bold">{stats.pos.orders}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Doanh thu
                </h3>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.pos.revenue)}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Shipper Stats */}
        {userRole === "SHIPPER" && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Tổng đơn giao
                </h3>
                <p className="text-3xl font-bold">{stats.shipper.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Đã giao thành công
                </h3>
                <p className="text-3xl font-bold">{stats.shipper.delivered}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-red-600" />
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Trả hàng</h3>
                <p className="text-3xl font-bold">{stats.shipper.returned}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Tỷ lệ thành công
                </h3>
                <p className="text-3xl font-bold">
                  {stats.shipper.successRate}%
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Cashier Stats */}
        {userRole === "CASHIER" && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Giao dịch
                </h3>
                <p className="text-3xl font-bold">
                  {stats.cashier.transactions}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {periodLabels[period]}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">
                  Tổng tiền thu
                </h3>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.cashier.revenue)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PersonalStatsWidget;
