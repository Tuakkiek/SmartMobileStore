// ============================================
// FILE: frontend/src/pages/order-manager/OrderManagementPage.jsx
// Trang quản lý đơn hàng cho ORDER_MANAGER
// ============================================

import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Filter,
  Eye,
  Pencil,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { orderAPI } from "@/lib/api";
import { getStatusColor, getStatusStage, getStatusText } from "@/lib/utils";
import OrderDetailDialog from "@/components/employee/OrderDetailDialog";
import OrderStatusUpdateDialog from "@/components/order/OrderStatusUpdateDialog";

const OrderManagementPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusDialogOrder, setStatusDialogOrder] = useState(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [page, stageFilter]);

  const resolveOrderStage = (order) => {
    return order?.statusStage || getStatusStage(order?.status) || "PENDING";
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(stageFilter !== "ALL" && { statusStage: stageFilter }),
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await orderAPI.getAll(params);

      setOrders(response.data.orders || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const openStatusDialog = (order) => {
    setStatusDialogOrder(order);
    setIsStatusDialogOpen(true);
  };

  const canUpdateOrderStatus = (order) => {
    const stage = resolveOrderStage(order);
    const nonEditableStages = ["CANCELLED", "RETURNED"];
    return !nonEditableStages.includes(stage);
  };

  const getStatusBadge = (statusStage) => {
    return (
      <Badge className={getStatusColor(statusStage)} variant="outline">
        {getStatusText(statusStage)}
      </Badge>
    );
  };

  const getPaymentBadge = (status) => {
    const config = {
      PENDING: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Chờ thanh toán",
      },
      PAID: { color: "bg-green-100 text-green-800", label: "Đã thanh toán" },
      FAILED: { color: "bg-red-100 text-red-800", label: "Thất bại" },
      REFUNDED: { color: "bg-gray-100 text-gray-800", label: "Đã hoàn" },
    };

    const paymentConfig = config[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };

    return (
      <Badge className={paymentConfig.color} variant="outline" size="sm">
        {paymentConfig.label}
      </Badge>
    );
  };

  const getFulfillmentLabel = (type) => {
    const map = {
      HOME_DELIVERY: "Giao tận nhà",
      CLICK_AND_COLLECT: "Nhận tại cửa hàng",
      IN_STORE: "Mua tại cửa hàng",
    };
    return map[type] || type || "N/A";
  };

  const getPaymentMethodLabel = (method) => {
    const map = {
      COD: "COD",
      VNPAY: "VNPay",
      CASH: "Tiền mặt",
      BANK_TRANSFER: "Chuyển khoản",
      MOMO: "MoMo",
      CREDIT_CARD: "Thẻ",
    };
    return map[method] || method || "N/A";
  };

  const getOrderTotal = (order) => {
    const total = Number(order?.total);
    if (Number.isFinite(total) && total >= 0) return total;

    const subtotal = Number(order?.subtotal);
    if (Number.isFinite(subtotal) && subtotal >= 0) {
      return (
        subtotal +
        (Number(order?.shippingFee) || 0) -
        (Number(order?.discount) || 0)
      );
    }

    return (order?.items || []).reduce((sum, item) => {
      return sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
    }, 0);
  };

  const formatCurrency = (amount) => {
    const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(safeAmount);
  };

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản Lý Đơn Hàng</h1>
        <p className="text-gray-600 mt-2">Theo dõi và xử lý đơn hàng</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ xử lý</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {
                    orders.filter((o) =>
                      ["PENDING", "PENDING_PAYMENT", "CONFIRMED", "PICKING"].includes(
                        resolveOrderStage(o),
                      ),
                    ).length
                  }
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang giao</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    orders.filter((o) =>
                      ["PICKUP_COMPLETED", "IN_TRANSIT"].includes(resolveOrderStage(o)),
                    ).length
                  }
                </p>
              </div>
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoàn thành</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter((o) => resolveOrderStage(o) === "DELIVERED").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hủy</p>
                <p className="text-2xl font-bold text-red-600">
                  {orders.filter((o) => resolveOrderStage(o) === "CANCELLED").length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo mã đơn, tên khách hàng, SĐT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Lọc giai đoạn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="PENDING">Mới tạo</SelectItem>
                <SelectItem value="PENDING_PAYMENT">Chờ thanh toán</SelectItem>
                <SelectItem value="PAYMENT_FAILED">Thanh toán thất bại</SelectItem>
                <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                <SelectItem value="PICKING">Đang lấy hàng</SelectItem>
                <SelectItem value="PICKUP_COMPLETED">Lấy hàng xong</SelectItem>
                <SelectItem value="IN_TRANSIT">Đang vận chuyển</SelectItem>
                <SelectItem value="DELIVERED">Đã giao</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                <SelectItem value="RETURNED">Đã trả</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Đơn Hàng ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Không có đơn hàng nào</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Kênh nhận</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Thanh toán</TableHead>
                    <TableHead>Giai đoạn</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {order.shippingAddress?.fullName || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.shippingAddress?.phoneNumber || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.items?.length || 0} sản phẩm
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">
                            {getFulfillmentLabel(order.fulfillmentType)}
                          </p>
                          {order.assignedStore?.storeName && (
                            <p className="text-xs text-gray-500">
                              {order.assignedStore.storeName}
                            </p>
                          )}
                          {order.pickupInfo?.pickupCode && (
                            <p className="text-xs text-blue-700 font-semibold">
                              Mã nhận: {order.pickupInfo.pickupCode}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(getOrderTotal(order))}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(order.paymentStatus)}
                        <div className="text-xs text-gray-500 mt-1">
                          {getPaymentMethodLabel(order.paymentMethod)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(resolveOrderStage(order))}
                          {order.status && (
                            <p className="text-xs text-gray-500">
                              Chi tiết: {getStatusText(order.status)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => openStatusDialog(order)}
                            disabled={!canUpdateOrderStatus(order)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOrderDetail(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {Math.ceil(total / limit) > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Trước
                  </Button>

                  <div className="text-sm font-medium">
                    Trang {page} / {Math.ceil(total / limit)}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === Math.ceil(total / limit)}
                    onClick={() => setPage(page + 1)}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <OrderDetailDialog
        order={selectedOrder}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
      <OrderStatusUpdateDialog
        order={statusDialogOrder}
        open={isStatusDialogOpen}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setStatusDialogOrder(null);
        }}
        onSuccess={fetchOrders}
      />
    </div>
  );
};

export default OrderManagementPage;
