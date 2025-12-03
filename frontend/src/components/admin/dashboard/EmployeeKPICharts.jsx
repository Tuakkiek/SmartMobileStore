import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { Trophy, TrendingUp, Package, Truck, Award } from "lucide-react";

const EmployeeKPICharts = ({ stats }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* TOP PERFORMERS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top POS Staff */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <Badge className="bg-blue-100 text-blue-800">POS Top</Badge>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">
              Nhân viên bán hàng xuất sắc
            </h3>
            <p className="text-2xl font-bold mb-1">
              {stats?.topPOSStaff?.name || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats?.topPOSStaff?.orderCount || 0} đơn •{" "}
              {formatPrice(stats?.topPOSStaff?.revenue || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Top Shipper */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-800">Shipper Top</Badge>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">
              Shipper xuất sắc
            </h3>
            <p className="text-2xl font-bold mb-1">
              {stats?.topShipper?.name || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats?.topShipper?.deliveredCount || 0} đơn giao •{" "}
              {stats?.topShipper?.successRate?.toFixed(1) || 0}% thành công
            </p>
          </CardContent>
        </Card>

        {/* Top Cashier */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-800">
                Thu ngân Top
              </Badge>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">
              Thu ngân xuất sắc
            </h3>
            <p className="text-2xl font-bold mb-1">
              {stats?.topCashier?.name || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats?.topCashier?.transactionCount || 0} giao dịch •{" "}
              {formatPrice(stats?.topCashier?.totalAmount || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* POS STAFF PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất nhân viên POS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.posStaffPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Doanh thu" />
                <Bar dataKey="orderCount" fill="#10b981" name="Số đơn" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo nhân viên POS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.posStaffRevenue || []}
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
                  {(stats?.posStaffRevenue || []).map((entry, index) => (
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

      {/* SHIPPER PERFORMANCE - ✅ UPDATED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất Shipper</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats?.shipperPerformance || []}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="shipping" fill="#f59e0b" name="Đang giao" />
                <Bar dataKey="delivered" fill="#10b981" name="Đã giao" />
                <Bar dataKey="returned" fill="#ef4444" name="Trả hàng" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tỷ lệ giao hàng thành công - GIỮ NGUYÊN */}
        <Card>
          <CardHeader>
            <CardTitle>Tỷ lệ giao hàng thành công</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.shipperSuccessRate || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Tỷ lệ %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* DETAILED TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* POS Staff Detail */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết nhân viên POS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Tên</th>
                    <th className="text-right p-3">Đơn</th>
                    <th className="text-right p-3">Doanh thu</th>
                    <th className="text-right p-3">TB/Đơn</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.posStaffPerformance || []).map((staff, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{staff.name}</td>
                      <td className="text-right p-3">{staff.orderCount}</td>
                      <td className="text-right p-3">
                        {formatPrice(staff.revenue)}
                      </td>
                      <td className="text-right p-3">
                        {formatPrice(
                          staff.orderCount > 0
                            ? staff.revenue / staff.orderCount
                            : 0
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Shipper Detail */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết Shipper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Tên</th>
                    <th className="text-right p-3">Đang giao</th>
                    <th className="text-right p-3">Đã giao</th>
                    <th className="text-right p-3">Trả hàng</th>
                    <th className="text-right p-3">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.shipperPerformance || []).map((shipper, idx) => {
                    const completed = shipper.delivered + shipper.returned;
                    const rate =
                      completed > 0 ? (shipper.delivered / completed) * 100 : 0;
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{shipper.name}</td>
                        <td className="text-right p-3 text-orange-600">
                          {shipper.shipping || 0}
                        </td>
                        <td className="text-right p-3 text-green-600">
                          {shipper.delivered}
                        </td>
                        <td className="text-right p-3 text-red-600">
                          {shipper.returned}
                        </td>
                        <td className="text-right p-3">
                          <Badge
                            variant={
                              rate >= 90
                                ? "default"
                                : rate >= 70
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {rate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CASHIER PERFORMANCE */}
      <Card>
        <CardHeader>
          <CardTitle>Hiệu suất Thu ngân</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Tên</th>
                  <th className="text-right p-3">Giao dịch</th>
                  <th className="text-right p-3">Tổng tiền</th>
                  <th className="text-right p-3">TB/Giao dịch</th>
                  <th className="text-right p-3">Hóa đơn VAT</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.cashierPerformance || []).map((cashier, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{cashier.name}</td>
                    <td className="text-right p-3">
                      {cashier.transactionCount}
                    </td>
                    <td className="text-right p-3">
                      {formatPrice(cashier.totalAmount)}
                    </td>
                    <td className="text-right p-3">
                      {formatPrice(
                        cashier.transactionCount > 0
                          ? cashier.totalAmount / cashier.transactionCount
                          : 0
                      )}
                    </td>
                    <td className="text-right p-3">
                      {cashier.vatInvoiceCount || 0}
                    </td>
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

export default EmployeeKPICharts;
