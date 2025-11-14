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
  const getAllowedNextStatuses = (currentStatus) => {
    const flow = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPING", "CANCELLED"],
      SHIPPING: ["DELIVERED", "RETURNED", "CANCELLED"],
      DELIVERED: ["RETURNED"],
      RETURNED: [],
      CANCELLED: [],
    };
    return flow[currentStatus] || [];
  };
  const statusButtons = [
    { value: "all", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xác nhận" },
    { value: "CONFIRMED", label: "Chờ lấy hàng" },
    { value: "SHIPPING", label: "Đang giao hàng" },
    { value: "DELIVERED", label: "Đã giao hàng" },
    { value: "RETURNED", label: "Trả hàng" },
    { value: "CANCELLED", label: "Đã hủy" },
  ];

  const [statusUpdate, setStatusUpdate] = useState({
    status: "",
    note: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to get full image URL
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/64?text=No+Image";
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_API_URL}${
      path.startsWith("/") ? "" : "/"
    }${path}`;
  };

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
      console.log("Order detail from API:", response.data.data.order);
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
      status: "", // để trống, bắt chọn
      note: "",
    });
    setError("");
    setShowStatusDialog(true);
  };

  // const getNextStatus = (currentStatus) => {
  //   const statusFlow = {
  //     PENDING: "CONFIRMED",
  //     CONFIRMED: "SHIPPING",
  //     SHIPPING: "DELIVERED",
  //     // DELIVERED: "RETURNED", // ✅ HOẶC BỎ DÒNG NÀY
  //   };
  //   return statusFlow[currentStatus] || currentStatus;
  // };

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
      SHIPPING: Truck,
      DELIVERED: CheckCircle,
      RETURNED: XCircle, // THÊM MỚI (hoặc chọn icon khác như RotateCcw)
      CANCELLED: XCircle,
    };
    return icons[status] || Clock;
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      processing: orders.filter(
        (o) => o.status === "CONFIRMED" || o.status === "SHIPPING"
      ).length,
      shipping: orders.filter((o) => o.status === "SHIPPING").length,
      delivered: orders.filter((o) =>
        ["DELIVERED", "COMPLETED"].includes(o.status)
      ).length,
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
                {statusButtons.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
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
                <div className="flex flex-col gap-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-full ${
                          getStatusColor(order.status).split(" ")[0]
                        } flex items-center justify-center flex-shrink-0`}
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
                          order.status !== "RETURNED" &&
                          order.status !== "CANCELLED" &&
                          getAllowedNextStatuses(order.status).length > 0 && (
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

                  {/* ✅ THÊM PHẦN NÀY - Product Preview */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Sản phẩm ({order.items?.length})
                      </h4>
                      <div className="text-sm text-muted-foreground">
                        PT: {getStatusText(order.paymentMethod)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {order.items?.slice(0, 4).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <img
                            src={getImageUrl(item.images?.[0])}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
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
              {/* THÊM PHẦN NÀY - Danh sách sản phẩm trong đơn */}
              <div>
                <h3 className="font-semibold mb-3">Sản phẩm trong đơn</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 border rounded-lg">
                      <img
                        src={item.images?.[0] || "/placeholder.png"}
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

              {/* Địa chỉ giao hàng */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Địa chỉ giao hàng</h3>
                <p>
                  {selectedOrder.shippingAddress?.fullName} -{" "}
                  {selectedOrder.shippingAddress?.phoneNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.shippingAddress?.detailAddress},{" "}
                  {selectedOrder.shippingAddress?.commune},
                  {selectedOrder.shippingAddress?.district},{" "}
                  {selectedOrder.shippingAddress?.province}
                </p>
              </div>

              {/* Tóm tắt đơn hàng */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí ship:</span>
                  <span>{formatPrice(selectedOrder.shippingFee)}</span>
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

            {/* === TRẠNG THÁI HIỆN TẠI (ĐÃ SỬA) === */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Trạng thái hiện tại
              </p>
              <Badge className={getStatusColor(selectedOrder?.status)}>
                {getStatusText(selectedOrder?.status)}
              </Badge>
            </div>

            {/* === CHỌN TRẠNG THÁI MỚI === */}
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
                  {getAllowedNextStatuses(selectedOrder?.status).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusText(status)}
                      </SelectItem>
                    )
                  )}
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
