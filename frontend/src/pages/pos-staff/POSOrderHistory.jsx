// ============================================
// FILE: frontend/src/pages/pos-staff/POSOrderHistory.jsx
// ✅ UPDATED: Thêm KPI filters thay vì PersonalStatsWidget
// ============================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  User,
  Phone,
  MapPin,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { posAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusStage,
  getStatusText,
} from "@/lib/utils";

import { useNavigate } from "react-router-dom"; // Added import

const POSOrderHistory = () => {
  const navigate = useNavigate(); // Added hook
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ KPI Filters
  const [kpiPeriod, setKpiPeriod] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  // Helper: Lấy URL ảnh
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/100?text=No+Image";
    if (path.startsWith("http")) return path;
    const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const resolveOrderStage = (order) => {
    return order?.statusStage || getStatusStage(order?.status) || "PENDING";
  };

  // ✅ Tính KPI dựa trên period
  const kpiStats = useMemo(() => {
    const now = new Date();
    let startDate, endDate;

    switch (kpiPeriod) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          return { ordersCreated: 0, revenue: 0 };
        }
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    const filteredOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const paidOrders = filteredOrders.filter((o) => o.paymentStatus === "PAID");

    return {
      ordersCreated: filteredOrders.length,
      revenue: paidOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    };
  }, [orders, kpiPeriod, customStartDate, customEndDate]);

  // Load đơn hàng
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: 10,
        search: searchTerm || undefined,
      };

      const response = await posAPI.getHistory(params);
      const { orders = [], pagination: pag = {} } = response.data.data || {};

      setOrders(orders);
      setPagination({
        currentPage: pag.currentPage || 1,
        totalPages: pag.totalPages || 1,
        total: pag.total || 0,
      });
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
      toast.error("Không thể tải lịch sử đơn hàng");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.currentPage, searchTerm]);

  // Xem chi tiết
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewDetail = async (orderId) => {
    if (!orderId) {
      toast.error("Không có ID đơn hàng");
      return;
    }

    setIsLoadingDetail(true);
    setShowDetailDialog(true);

    try {
      const response = await posAPI.getOrderById(orderId);
      if (!response?.data?.data?.order) {
        throw new Error("Không tìm thấy đơn hàng");
      }
      setSelectedOrder(response.data.data.order);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết:", error);
      toast.error(
        error.response?.data?.message || "Không thể tải chi tiết đơn hàng"
      );
      setShowDetailDialog(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Thống kê cơ bản
  const basicStats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => resolveOrderStage(o) === "PENDING_PAYMENT")
        .length,
      paid: orders.filter((o) => o.paymentStatus === "PAID").length,
      cancelled: orders.filter((o) => resolveOrderStage(o) === "CANCELLED")
        .length,
    }),
    [orders]
  );

  const periodLabels = {
    today: "Hôm nay",
    week: "Tuần này",
    month: "Tháng này",
    custom: "Tùy chỉnh",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Lịch sử bán hàng</h1>
        <p className="text-muted-foreground">
          Tổng số: {pagination.total} đơn hàng
        </p>
      </div>

      {/* ✅ KPI SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Thống kê hiệu suất
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Period Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <select
                  value={kpiPeriod}
                  onChange={(e) => setKpiPeriod(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white text-sm font-medium"
                >
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {kpiPeriod === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">đến</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Đơn hàng đã tạo
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {kpiStats.ordersCreated}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Doanh thu
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice(kpiStats.revenue)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{basicStats.total}</div>
            <p className="text-sm text-muted-foreground">Tổng đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {basicStats.pending}
            </div>
            <p className="text-sm text-muted-foreground">Chờ thanh toán</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {basicStats.paid}
            </div>
            <p className="text-sm text-muted-foreground">Đã thanh toán</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {basicStats.cancelled}
            </div>
            <p className="text-sm text-muted-foreground">Đã hủy</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã đơn, số phiếu..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Đang tải danh sách...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Không có đơn hàng nào</p>
          </div>
        ) : (
          orders.map((order) => {
            const stage = resolveOrderStage(order);
            const isPending = stage === "PENDING_PAYMENT";
            const isPaid = order.paymentStatus === "PAID";
            const StatusIcon = isPending
              ? Clock
              : isPaid
              ? CheckCircle
              : XCircle;
            const statusColorClass = getStatusColor(stage || "UNKNOWN");
            const bgColor = statusColorClass.includes("bg-")
              ? statusColorClass.split(" ")[0]
              : "bg-gray-500";

            return (
              <Card key={order._id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center text-white`}
                        >
                          <StatusIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              #{order.orderNumber}
                            </h3>
                            <Badge
                              className={getStatusColor(stage || "UNKNOWN")}
                            >
                              {isPending
                                ? "Chờ thanh toán"
                                : getStatusText(stage)}
                            </Badge>
                            {order.posInfo?.receiptNumber && (
                              <Badge variant="outline">
                                Phiếu: {order.posInfo.receiptNumber}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {order.shippingAddress?.fullName || "Khách lẻ"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {order.shippingAddress?.phoneNumber || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatPrice(order.totalAmount)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(order._id)}
                          disabled={isLoadingDetail}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Chi tiết
                        </Button>
                        {/* ✅ Handover Action */}
                        {(order.status === "PREPARING_SHIPMENT" || order.statusStage === "PICKUP_COMPLETED") &&
                          order.orderSource === "IN_STORE" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => navigate(`/pos-staff/handover/${order._id}`)}
                            >
                              <Package className="w-4 h-4 mr-2" />
                              Nhận bàn giao
                            </Button>
                          )}
                      </div>
                    </div>

                    {/* Product Preview */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Sản phẩm ({order.items?.length || 0})
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {order.items?.slice(0, 4).map((item, idx) => (
                          <div
                            key={item._id || idx}
                            className="flex gap-2 p-2 border rounded-lg hover:bg-muted/50"
                          >
                            <img
                              src={getImageUrl(item.images?.[0])}
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded"
                              onError={(e) => {
                                e.target.src =
                                  "https://via.placeholder.com/64?text=No+Image";
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium line-clamp-2 mb-1">
                                {item.productName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                SL: {item.quantity}
                              </p>
                              <p className="text-xs font-semibold text-primary">
                                {formatPrice(item.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items?.length > 4 && (
                          <div className="flex items-center justify-center p-2 border rounded-lg bg-muted/30">
                            <div className="text-center">
                              <Package className="w-8 h-8 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs font-medium">
                                +{order.items.length - 4} SP
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={pagination.currentPage === 1 || isLoading}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                currentPage: prev.currentPage - 1,
              }))
            }
          >
            Trước
          </Button>
          <span className="px-4 py-2">
            Trang {pagination.currentPage} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={
              pagination.currentPage === pagination.totalPages || isLoading
            }
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                currentPage: prev.currentPage + 1,
              }))
            }
          >
            Sau
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
            <DialogDescription>
              Mã đơn: #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Sản phẩm trong đơn</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="flex gap-4 p-4 border rounded-lg"
                    >
                      <img
                        src={getImageUrl(item.images?.[0])}
                        alt={item.productName}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {[
                            item.variantColor,
                            item.variantStorage,
                            item.variantConnectivity,
                            item.variantName,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                        <p className="text-sm">
                          SL: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Địa chỉ
                </h3>
                <p>
                  {selectedOrder.shippingAddress?.fullName || "Khách lẻ"} -{" "}
                  {selectedOrder.shippingAddress?.phoneNumber || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.shippingAddress?.detailAddress
                    ? `${selectedOrder.shippingAddress.detailAddress}, ${selectedOrder.shippingAddress.ward}, ${selectedOrder.shippingAddress.province}`
                    : "Mua tại cửa hàng"}
                </p>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>
                    {formatPrice(
                      selectedOrder.subtotal || selectedOrder.totalAmount
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Tổng:</span>
                  <span className="text-primary">
                    {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSOrderHistory;
