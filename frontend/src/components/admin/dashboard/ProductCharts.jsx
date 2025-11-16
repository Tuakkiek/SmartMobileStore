// ============================================
// FILE 3: frontend/src/components/admin/dashboard/ProductCharts.jsx
// ============================================
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Star } from "lucide-react";

const ProductCharts = ({ stats }) => {
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 20 sản phẩm bán chạy nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.bestSellingProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#3b82f6" name="Lượt bán" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất sản phẩm (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={stats.productPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="salesCount"
                fill="#3b82f6"
                name="Lượt bán"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rating"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Đánh giá"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                {stats.bestSellingProducts.slice(0, 20).map((product, idx) => (
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
    </div>
  );
};

export default ProductCharts;
