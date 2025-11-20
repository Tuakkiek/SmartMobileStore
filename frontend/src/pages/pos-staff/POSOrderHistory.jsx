// ============================================
// FILE: frontend/src/pages/pos-staff/POSOrderHistory.jsx
// ĐÃ SỬA: LOADING, ERROR HANDLING, POS INFO, KEY, STATUS TEXT
// ============================================

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { posAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

const POSOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false); // Thêm loading cho dialog
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  // Helper: Lấy URL ảnh
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/64?text=No+Image";
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_API_URL}${
      path.startsWith("/") ? "" : "/"
    }${path}`;
  };

  // Load đơn hàng
  useEffect(() => {
    fetchOrders();
  }, [searchTerm, dateFilter, pagination.currentPage]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: 20,
        search: searchTerm || undefined,
        startDate: dateFilter.startDate || undefined,
        endDate: dateFilter.endDate || undefined,
      };

      const response = await posAPI.getMyOrders(params);
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
  };

  // Xem chi tiết – ĐÃ SỬA HOÀN TOÀN
  const handleViewDetail = async (orderId) => {
    if (!orderId) {
      toast.error("Không có ID đơn hàng");
      return;
    }

    setIsLoadingDetail(true);
    setShowDetailDialog(true);

    try {
      console.log("Đang lấy chi tiết đơn hàng:", orderId);
      const response = await posAPI.getOrderById(orderId);

      if (!response?.data?.data?.order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      setSelectedOrder(response.data.data.order);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết:", error);
      toast.error(
        error.response?.data?.message ||
          "Không thể tải chi tiết đơn hàng. Vui lòng thử lại."
      );
      setShowDetailDialog(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Thống kê
  const getStats = () => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
      paid: orders.filter((o) => o.paymentStatus === "PAID").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    };
  };

  const stats = getStats();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Lịch sử bán hàng</h1>
        <p className="text-muted-foreground">
          Tổng số: {pagination.total} đơn hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Tổng đơn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <p className="text-sm text-muted-foreground">Chờ thanh toán</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.paid}
            </div>
            <p className="text-sm text-muted-foreground">Đã thanh toán</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.cancelled}
            </div>
            <p className="text-sm text-muted-foreground">Đã hủy</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => {
                setDateFilter({ ...dateFilter, startDate: e.target.value });
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
              }}
            />
            <Input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => {
                setDateFilter({ ...dateFilter, endDate: e.target.value });
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
              }}
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
            const isPending = order.status === "PENDING_PAYMENT";
            const isPaid = order.paymentStatus === "PAID";
            const StatusIcon = isPending
              ? Clock
              : isPaid
              ? CheckCircle
              : XCircle;

            const statusColorClass = getStatusColor(order.status || "UNKNOWN");
            const bgColor = statusColorClass.includes("bg-")
              ? statusColorClass.split(" ")[0]
              : "bg-gray-500";

            return (
              <Card key={order._id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
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
                              className={getStatusColor(
                                order.status || "UNKNOWN"
                              )}
                            >
                              {isPending
                                ? "Chờ thanh toán"
                                : getStatusText(
                                    order.paymentStatus || order.status
                                  )}
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
                            key={item._id || idx} // Dùng _id nếu có, fallback idx
                            className="flex gap-2 p-2 border rounded-lg hover:bg-muted/50"
                          >
                            <img
                              src={getImageUrl(item.images?.[0])}
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded"
                              onError={(e) => {
                                e.target.onerror = null;
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

      {/* DETAIL DIALOG – CHẠY ỔN ĐỊNH */}
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
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Đang tải chi tiết...
                </p>
              </div>
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6">
              {/* SẢN PHẨM */}
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
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://via.placeholder.com/64?text=No+Image";
                        }}
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

              {/* ĐỊA CHỈ GIAO HÀNG */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Địa chỉ giao hàng
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

              {/* TÓM TẮT ĐƠN HÀNG */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>
                    {formatPrice(
                      selectedOrder.subtotal || selectedOrder.totalAmount
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phí ship:</span>
                  <span>{formatPrice(selectedOrder.shippingFee || 0)}</span>
                </div>
                {selectedOrder.promotionDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá:</span>
                    <span>-{formatPrice(selectedOrder.promotionDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Tổng:</span>
                  <span className="text-primary">
                    {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* POS INFO (nếu có) */}
              {selectedOrder.posInfo && (
                <div className="p-4 bg-blue-50 rounded-lg text-sm">
                  <p>
                    <strong>Thu ngân:</strong>{" "}
                    {selectedOrder.posInfo.cashierName}
                  </p>
                  <p>
                    <strong>Tiền khách đưa:</strong>{" "}
                    {formatPrice(selectedOrder.posInfo.paymentReceived)}
                  </p>
                  <p>
                    <strong>Tiền thối:</strong>{" "}
                    {formatPrice(selectedOrder.posInfo.changeGiven || 0)}
                  </p>
                  {selectedOrder.posInfo.receiptNumber && (
                    <p>
                      <strong>Số phiếu:</strong>{" "}
                      {selectedOrder.posInfo.receiptNumber}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Không có dữ liệu đơn hàng
            </div>
          )}

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
