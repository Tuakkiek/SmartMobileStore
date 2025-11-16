// ============================================
// FILE 6: frontend/src/components/admin/dashboard/OrderCharts.jsx
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
import { Clock, CheckCircle, XCircle, Package } from "lucide-react";

const OrderCharts = ({ stats }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chờ xác nhận</p>
                <h3 className="text-2xl font-bold text-yellow-600">
                  {stats.pendingOrders}
                </h3>
              </div>
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã giao</p>
                <h3 className="text-2xl font-bold text-green-600">
                  {stats.completedOrders}
                </h3>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã hủy</p>
                <h3 className="text-2xl font-bold text-red-600">
                  {stats.cancelledOrders}
                </h3>
              </div>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giá trị TB</p>
                <h3 className="text-2xl font-bold">
                  {formatPrice(stats.avgOrderValue)}
                </h3>
              </div>
              <Package className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ trạng thái đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết trạng thái</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Top 10 sản phẩm bán chạy (theo doanh thu)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip formatter={(value) => formatPrice(value)} />
              <Bar dataKey="revenue" fill="#10b981" name="Doanh thu" />
            </BarChart>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">
              Tỷ lệ hoàn thành
            </p>
            <h3 className="text-2xl font-bold text-green-600">
              {stats.totalOrders > 0
                ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
                : 0}
              %
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedOrders}/{stats.totalOrders} đơn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Tỷ lệ hủy</p>
            <h3 className="text-2xl font-bold text-red-600">
              {stats.totalOrders > 0
                ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1)
                : 0}
              %
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cancelledOrders}/{stats.totalOrders} đơn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Đơn đang xử lý</p>
            <h3 className="text-2xl font-bold text-blue-600">
              {stats.totalOrders -
                stats.completedOrders -
                stats.cancelledOrders}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Cần xử lý</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderCharts;
