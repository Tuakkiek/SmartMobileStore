// ============================================
// FILE: src/pages/order-manager/OrderManagementPage.jsx
// ============================================
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  ShoppingBag,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Package,
  User,
  MapPin,
  Phone,
} from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  const [statusUpdate, setStatusUpdate] = useState({
    status: "",
    note: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, statusFilter, pagination.currentPage]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: 20,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      const response = await orderAPI.getAll(params);
      const { orders, totalPages, currentPage, total } = response.data.data;

      setOrders(orders);
      setPagination({ currentPage, totalPages, total });
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (orderId) => {
    try {
      const response = await orderAPI.getById(orderId);
      setSelectedOrder(response.data.data.order);
      setShowDetailDialog(true);
    } catch (error) {
      alert(
        error.response?.data?.message || "Không thể tải thông tin đơn hàng"
      );
    }
  };

  const handleOpenStatusDialog = (order) => {
    setSelectedOrder(order);
    setStatusUpdate({
      status: getNextStatus(order.status),
      note: "",
    });
    setError("");
    setShowStatusDialog(true);
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      PENDING: "CONFIRMED",
      CONFIRMED: "PROCESSING",
      PROCESSING: "SHIPPING",
      SHIPPING: "DELIVERED",
    };
    return statusFlow[currentStatus] || currentStatus;
  };

  const handleUpdateStatus = async () => {
    if (!statusUpdate.status) {
      setError("Vui lòng chọn trạng thái");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await orderAPI.updateStatus(selectedOrder._id, statusUpdate);
      await fetchOrders();
      setShowStatusDialog(false);
      toast.success("Cập nhật trạng thái thành công");
    } catch (error) {
      setError(error.response?.data?.message || "Cập nhật trạng thái thất bại");
      toast.error("Cập nhật trạng thái thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      PENDING: Clock,
      CONFIRMED: CheckCircle,
      PROCESSING: Package,
      SHIPPING: Truck,
      DELIVERED: CheckCircle,
      CANCELLED: XCircle,
    };
    return icons[status] || Clock;
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      processing: orders.filter(
        (o) => o.status === "CONFIRMED" || o.status === "PROCESSING"
      ).length,
      shipping: orders.filter((o) => o.status === "SHIPPING").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
    };
    return stats;
  };

  if (isLoading && orders.length === 0) {
    return <Loading />;
  }

  const stats = getOrderStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Quản lý đơn hàng</h1>
        <p className="text-muted-foreground">
          Tổng số: {pagination.total} đơn hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <p className="text-sm text-muted-foreground">Chờ xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.processing}
            </div>
            <p className="text-sm text-muted-foreground">Đang xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">
              {stats.shipping}
            </div>
            <p className="text-sm text-muted-foreground">Đang giao</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </div>
            <p className="text-sm text-muted-foreground">Đã giao</p>
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
                placeholder="Tìm mã đơn hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPagination({ ...pagination, currentPage: 1 });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                <SelectItem value="SHIPPING">Đang giao</SelectItem>
                <SelectItem value="DELIVERED">Đã giao</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => {
          const StatusIcon = getStatusIcon(order.status);
          return (
            <Card key={order._id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-full ${
                        getStatusColor(order.status).split(" ")[0]
                      } flex items-center justify-center`}
                    >
                      <StatusIcon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          #{order.orderNumber}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{order.customerId?.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{order.customerId?.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {order.shippingAddress?.detailAddress},{" "}
                          {order.shippingAddress?.commune},{" "}
                          {order.shippingAddress?.district},{" "}
                          {order.shippingAddress?.province}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Số sản phẩm:{" "}
                          </span>
                          <span className="font-semibold">
                            {order.items?.length}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Thanh toán:{" "}
                          </span>
                          <span className="font-semibold">
                            {getStatusText(order.paymentMethod)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(order.totalAmount)}
                      </p>
                      <Badge
                        variant={
                          order.paymentStatus === "PAID"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {getStatusText(order.paymentStatus)}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(order._id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Chi tiết
                      </Button>
                      {order.status !== "DELIVERED" &&
                        order.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenStatusDialog(order)}
                          >
                            Cập nhật
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.currentPage === 1}
            onClick={() =>
              setPagination({
                ...pagination,
                currentPage: pagination.currentPage - 1,
              })
            }
          >
            Trước
          </Button>
          <span className="px-4 py-2">
            Trang {pagination.currentPage} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() =>
              setPagination({
                ...pagination,
                currentPage: pagination.currentPage + 1,
              })
            }
          >
            Sau
          </Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
            <DialogDescription>
              Mã đơn: #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <Badge
                  className={`${getStatusColor(
                    selectedOrder.status
                  )} text-base px-4 py-2`}
                >
                  {getStatusText(selectedOrder.status)}
                </Badge>
                <Badge
                  variant={
                    selectedOrder.paymentStatus === "PAID"
                      ? "default"
                      : "secondary"
                  }
                  className="text-base px-4 py-2"
                >
                  {getStatusText(selectedOrder.paymentStatus)}
                </Badge>
              </div>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Thông tin khách hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {selectedOrder.shippingAddress?.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedOrder.shippingAddress?.phoneNumber}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <span>
                      {selectedOrder.shippingAddress?.detailAddress},{" "}
                      {selectedOrder.shippingAddress?.commune},{" "}
                      {selectedOrder.shippingAddress?.district},{" "}
                      {selectedOrder.shippingAddress?.province}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sản phẩm</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 pb-4 border-b last:border-0"
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          {item.productId?.images?.[0] ? (
                            <img
                              src={item.productId.images[0]}
                              alt={item.productName}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.productName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.price)} x {item.quantity}
                          </p>
                          {item.discount > 0 && (
                            <Badge variant="destructive" className="mt-1">
                              -{item.discount}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(
                              item.price *
                                item.quantity *
                                (1 - item.discount / 100)
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-base">
                      <span>Tổng cộng:</span>
                      <span className="font-bold text-xl text-primary">
                        {formatPrice(selectedOrder.totalAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử đơn hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.statusHistory?.map((history, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${
                            getStatusColor(history.status).split(" ")[0]
                          } flex items-center justify-center flex-shrink-0`}
                        >
                          {React.createElement(getStatusIcon(history.status), {
                            className: "w-4 h-4",
                          })}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getStatusColor(history.status)}>
                              {getStatusText(history.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(history.updatedAt)}
                            </span>
                          </div>
                          {history.note && (
                            <p className="text-sm text-muted-foreground">
                              {history.note}
                            </p>
                          )}
                          {history.updatedBy && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Cập nhật bởi: {history.updatedBy.fullName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ghi chú</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}
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

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
            <DialogDescription>
              Mã đơn: #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && <ErrorMessage message={error} />}

            <div className="space-y-2">
              <Label>Trạng thái hiện tại</Label>
              <div>
                <Badge className={getStatusColor(selectedOrder?.status)}>
                  {getStatusText(selectedOrder?.status)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Trạng thái mới *</Label>
              <Select
                value={statusUpdate.status}
                onValueChange={(value) =>
                  setStatusUpdate({ ...statusUpdate, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                  <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                  <SelectItem value="SHIPPING">Đang giao hàng</SelectItem>
                  <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                  <SelectItem value="CANCELLED">Hủy đơn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                placeholder="Nhập ghi chú về cập nhật này..."
                value={statusUpdate.note}
                onChange={(e) =>
                  setStatusUpdate({ ...statusUpdate, note: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
