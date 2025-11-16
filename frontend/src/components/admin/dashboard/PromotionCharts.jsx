
// ============================================
// FILE 5: frontend/src/components/admin/dashboard/PromotionCharts.jsx
// ============================================
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Gift, Activity, CheckCircle } from "lucide-react";

const PromotionCharts = ({ stats }) => {
  const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const usageData = stats.topPromotions.map((promo) => ({
    name: promo.code,
    used: promo.used,
    remaining: promo.limit - promo.used,
    percentage: ((promo.used / promo.limit) * 100).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng mã KM</p>
                <h3 className="text-2xl font-bold">{stats.promotions.length}</h3>
              </div>
              <Gift className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <h3 className="text-2xl font-bold text-green-600">{stats.activePromotions}</h3>
              </div>
              <Activity className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lượt sử dụng</p>
                <h3 className="text-2xl font-bold">{stats.usedPromotions}</h3>
              </div>
              <CheckCircle className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 mã được dùng nhiều nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topPromotions.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="code" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="used" fill="#3b82f6" name="Lượt dùng" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tỷ lệ sử dụng mã khuyến mãi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageData.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="used"
                >
                  {usageData.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết mã khuyến mãi</CardTitle>
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
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${
                            idx === 0
                              ? "bg-yellow-500"
                              : idx === 1
                              ? "bg-gray-400"
                              : idx === 2
                              ? "bg-orange-500"
                              : "bg-purple-300"
                          }`}
                        >
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
                        <Badge className="bg-green-100 text-green-800">{promo.discount}</Badge>
                      </td>
                      <td className="text-right p-3 font-bold">{promo.used}</td>
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
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{percentage.toFixed(0)}%</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Mã sắp hết lượt</p>
            <h3 className="text-2xl font-bold text-orange-600">
              {stats.topPromotions.filter((p) => p.used / p.limit >= 0.8).length}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">≥ 80% đã dùng</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Mã ít sử dụng</p>
            <h3 className="text-2xl font-bold text-blue-600">
              {stats.topPromotions.filter((p) => p.used / p.limit < 0.2).length}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{'< 20% đã dùng'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Trung bình lượt dùng</p>
            <h3 className="text-2xl font-bold text-purple-600">
              {stats.topPromotions.length > 0
                ? (stats.usedPromotions / stats.topPromotions.length).toFixed(1)
                : 0}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">lượt/mã</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromotionCharts;