// ============================================
// FILE 4: frontend/src/components/admin/dashboard/InventoryCharts.jsx
// ============================================
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, XCircle, Box, TrendingUp } from "lucide-react";

const InventoryCharts = ({ stats }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const CHART_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng tồn kho</p>
                <h3 className="text-2xl font-bold">
                  {stats.totalStock.toLocaleString()}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalVariants} biến thể
                </p>
              </div>
              <Box className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giá trị kho</p>
                <h3 className="text-2xl font-bold">
                  {(stats.inventoryValue / 1000000000).toFixed(1)}B
                </h3>
                <p className="text-xs text-muted-foreground mt-1">VNĐ</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết hàng</p>
                <h3 className="text-2xl font-bold text-orange-600">
                  {stats.lowStockProducts}
                </h3>
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
                <Bar dataKey="stock" fill="#3b82f6" name="Số lượng" />
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
                  label={({ name, value }) => `${name}: ${formatPrice(value)}`}
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
                  <th className="text-right p-3">% Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {stats.categoryStock.map((cat, idx) => {
                  const percentage = (cat.value / stats.inventoryValue) * 100;
                  return (
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
                      <td className="text-right p-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="p-3">Tổng cộng</td>
                  <td className="text-right p-3">{stats.totalProducts}</td>
                  <td className="text-right p-3">
                    {stats.totalStock.toLocaleString()}
                  </td>
                  <td className="text-right p-3">
                    {formatPrice(stats.inventoryValue)}
                  </td>
                  <td className="text-right p-3">
                    {formatPrice(stats.inventoryValue / stats.totalProducts)}
                  </td>
                  <td className="text-right p-3">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryCharts;
