// ============================================
// FILE: frontend/src/pages/shipper/ShipperDashboard.jsx
// ĐÃ CẬP NHẬT: Hiển thị trạng thái VNPay + Không thu tiền cho đơn đã thanh toán online
// ============================================

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/shared/Loading";
import { toast } from "sonner";
import {
  Package,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  Navigation,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  RotateCcw,
  CheckCircle2, // ĐÃ THÊM: Icon cho thanh toán thành công
} from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

const ShipperDashboard = () => {
  const [rawOrders, setRawOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [amountRangeFilter, setAmountRangeFilter] = useState("all");

  /* ------------------------------------------------------------------ */
  /* FETCH DATA */
  /* ------------------------------------------------------------------ */
  const fetchAllOrders = async () => {
    setIsLoading(true);
    try {
      const statusList = ["SHIPPING", "DELIVERED", "RETURNED"];
      const promises = statusList.map((status) =>
        orderAPI.getAll({ status, limit: 1000 })
      );
      const responses = await Promise.all(promises);
      const all = responses.flatMap((r) => r.data.data.orders || []);
      setRawOrders(all);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  /* ------------------------------------------------------------------ */
  /* FILTER LOGIC */
  /* ------------------------------------------------------------------ */
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 86400000) };
      case "yesterday": {
        const yesterday = new Date(today.getTime() - 86400000);
        return { start: yesterday, end: today };
      }
      case "week": {
        const weekStart = new Date(today.getTime() - 7 * 86400000);
        return { start: weekStart, end: new Date(today.getTime() + 86400000) };
      }
      case "month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: new Date(today.getTime() + 86400000) };
      }
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            start: customStartDate,
            end: new Date(customEndDate.getTime() + 86400000),
          };
        }
        return { start: today, end: new Date(today.getTime() + 86400000) };
      case "all":
      default:
        return null;
    }
  };

  const districts = useMemo(() => {
    const unique = [
      ...new Set(
        rawOrders.map((o) => o.shippingAddress?.district).filter(Boolean)
      ),
    ];
    return unique.sort();
  }, [rawOrders]);

  const { pendingOrders, completedOrders, returnedOrders } = useMemo(() => {
    let filtered = rawOrders;
    const range = getDateRange();
    if (range) {
      filtered = filtered.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= range.start && d < range.end;
      });
    }
    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter(
        (o) => o.paymentMethod === paymentMethodFilter
      );
    }
    if (districtFilter !== "all") {
      filtered = filtered.filter(
        (o) => o.shippingAddress?.district === districtFilter
      );
    }
    if (amountRangeFilter !== "all") {
      filtered = filtered.filter((o) => {
        const a = o.totalAmount;
        switch (amountRangeFilter) {
          case "under10m":
            return a < 10000000;
          case "10m-20m":
            return a >= 10000000 && a < 20000000;
          case "20m-50m":
            return a >= 20000000 && a < 50000000;
          case "over50m":
            return a >= 50000000;
          default:
            return true;
        }
      });
    }

    return {
      pendingOrders: filtered.filter((o) => o.status === "SHIPPING"),
      completedOrders: filtered.filter((o) => o.status === "DELIVERED"),
      returnedOrders: filtered.filter((o) => o.status === "RETURNED"),
    };
  }, [
    rawOrders,
    dateRange,
    customStartDate,
    customEndDate,
    paymentMethodFilter,
    districtFilter,
    amountRangeFilter,
  ]);

  const stats = useMemo(
    () => ({
      totalToday:
        pendingOrders.length + completedOrders.length + returnedOrders.length,
      pending: pendingOrders.length,
      completed: completedOrders.length,
      failed: returnedOrders.length,
    }),
    [pendingOrders, completedOrders, returnedOrders]
  );

  const currentOrders = {
    pending: pendingOrders,
    completed: completedOrders,
    returned: returnedOrders,
  }[activeTab];

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return currentOrders || [];
    const q = searchQuery.toLowerCase();
    return (currentOrders || []).filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.shippingAddress?.fullName?.toLowerCase().includes(q) ||
        o.shippingAddress?.phoneNumber?.includes(q)
    );
  }, [currentOrders, searchQuery]);

  /* ------------------------------------------------------------------ */
  /* ACTION HANDLERS */
  /* ------------------------------------------------------------------ */
  const refreshAfterAction = () => fetchAllOrders();

  const handleCompleteDelivery = async () => {
    if (!completionNote.trim())
      return toast.error("Vui lòng nhập ghi chú giao hàng");
    setIsSubmitting(true);
    try {
      await orderAPI.updateStatus(selectedOrder._id, {
        status: "DELIVERED",
        note: `Giao hàng thành công. ${completionNote}`,
      });
      toast.success("Đã xác nhận giao hàng thành công");
      setShowCompleteDialog(false);
      refreshAfterAction();
    } catch (e) {
      toast.error(e.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnOrder = async () => {
    if (!returnReason.trim())
      return toast.error("Vui lòng nhập lý do trả hàng");
    setIsSubmitting(true);
    try {
      await orderAPI.updateStatus(selectedOrder._id, {
        status: "RETURNED",
        note: `Trả hàng. Lý do: ${returnReason}`,
      });
      toast.success("Đã xác nhận trả hàng");
      setShowReturnDialog(false);
      refreshAfterAction();
    } catch (e) {
      toast.error(e.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openGoogleMaps = (addr) => {
    const full = `${addr.detailAddress}, ${addr.commune}, ${addr.district}, ${addr.province}, Vietnam`;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        full
      )}`,
      "_blank"
    );
  };

  const callCustomer = (phone) => (window.location.href = `tel:${phone}`);

  /* ------------------------------------------------------------------ */
  /* RENDER */
  /* ------------------------------------------------------------------ */
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Bảng điều khiển giao hàng</h1>
        <p className="text-muted-foreground">
          Quản lý và theo dõi đơn hàng của bạn
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ... giữ nguyên 4 card thống kê ... */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Tổng đơn hôm nay
                </p>
                <h3 className="text-3xl font-bold">{stats.totalToday}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Đang giao</p>
                <h3 className="text-3xl font-bold text-yellow-600">
                  {stats.pending}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Đã giao</p>
                <h3 className="text-3xl font-bold text-green-600">
                  {stats.completed}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Trả hàng</p>
                <h3 className="text-3xl font-bold text-red-600">
                  {stats.failed}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Tìm kiếm theo mã đơn, tên hoặc số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" /> Bộ lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters (giữ nguyên như cũ) */}
      {/* Advanced Filters - ĐÃ SỬA LỖI: Di chuyển vào trong return */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Bộ lọc nâng cao</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateRange("today");
                  setPaymentMethodFilter("all");
                  setDistrictFilter("all");
                  setAmountRangeFilter("all");
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Đặt lại
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Khoảng thời gian */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Khoảng thời gian</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="today">Hôm nay</option>
                  <option value="yesterday">Hôm qua</option>
                  <option value="week">7 ngày qua</option>
                  <option value="month">Tháng này</option>
                  <option value="custom">Tùy chỉnh</option>
                  <option value="all">Tất cả</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {dateRange === "custom" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Từ ngày</label>
                    <input
                      type="date"
                      value={
                        customStartDate
                          ? customStartDate.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setCustomStartDate(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Đến ngày</label>
                    <input
                      type="date"
                      value={
                        customEndDate
                          ? customEndDate.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setCustomEndDate(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </>
              )}

              {/* Phương thức thanh toán */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Thanh toán</label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">Tất cả</option>
                  <option value="COD">Thu tiền mặt (COD)</option>
                  <option value="ONLINE">Đã thanh toán online</option>
                </select>
              </div>

              {/* Quận/Huyện */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quận/Huyện</label>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">Tất cả</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Khoảng giá */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Giá trị đơn hàng</label>
                <select
                  value={amountRangeFilter}
                  onChange={(e) => setAmountRangeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">Tất cả</option>
                  <option value="under10m">Dưới 10 triệu</option>
                  <option value="10m-20m">10 - 20 triệu</option>
                  <option value="20m-50m">20 - 50 triệu</option>
                  <option value="over50m">Trên 50 triệu</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="pending">Đang giao ({stats.pending})</TabsTrigger>
          <TabsTrigger value="completed">
            Đã giao ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="returned">Trả hàng ({stats.failed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <Loading />
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Không có đơn hàng
                </h3>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card
                  key={order._id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-0">
                    {/* Header màu */}
                    <div
                      className={`p-4 border-l-4 ${
                        order.status === "SHIPPING"
                          ? "bg-yellow-50 border-yellow-500"
                          : order.status === "DELIVERED"
                          ? "bg-green-50 border-green-500"
                          : "bg-red-50 border-red-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">
                              #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Thông tin giao hàng */}
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> Thông
                            tin giao hàng
                          </h4>
                          <div className="pl-6 space-y-1 text-sm">
                            <p className="font-medium">
                              {order.shippingAddress?.fullName}
                            </p>
                            <p className="text-muted-foreground">
                              {order.shippingAddress?.phoneNumber}
                            </p>
                            <p className="text-muted-foreground">
                              {order.shippingAddress?.detailAddress}
                            </p>
                            <p className="text-muted-foreground">
                              {order.shippingAddress?.commune},{" "}
                              {order.shippingAddress?.district}
                            </p>
                            <p className="text-muted-foreground">
                              {order.shippingAddress?.province}
                            </p>
                          </div>
                        </div>

                        {/* Chi tiết đơn hàng + THANH TOÁN */}
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> Chi
                            tiết đơn hàng
                          </h4>
                          <div className="pl-6 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Số sản phẩm:
                              </span>
                              <span className="font-medium">
                                {order.items?.length}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Tổng tiền:
                              </span>
                              <span className="font-bold text-primary">
                                {formatPrice(order.totalAmount)}
                              </span>
                            </div>

                            {/* CẬP NHẬT: Hiển thị trạng thái thanh toán */}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Thanh toán:
                              </span>
                              <Badge
                                variant={
                                  order.paymentMethod === "COD"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  order.paymentMethod === "VNPAY" &&
                                  order.paymentInfo?.vnpayVerified
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              >
                                {getStatusText(order.paymentMethod)}
                              </Badge>
                            </div>

                            {/* COD → Thu tiền mặt */}
                            {order.paymentMethod === "COD" && (
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-muted-foreground font-medium">
                                  Thu tiền mặt:
                                </span>
                                <span className="font-bold text-lg text-red-600">
                                  {formatPrice(order.totalAmount)}
                                </span>
                              </div>
                            )}

                            {/* VNPAY → Đã thanh toán online */}
                            {order.paymentMethod === "VNPAY" &&
                              order.paymentInfo?.vnpayVerified && (
                                <div className="flex items-center gap-2 pt-2 border-t text-green-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-sm font-medium">
                                    Đã thanh toán online
                                  </span>
                                </div>
                              )}

                            {/* BANK_TRANSFER → Đã thanh toán */}
                            {order.paymentMethod === "BANK_TRANSFER" &&
                              order.paymentStatus === "PAID" && (
                                <div className="flex items-center gap-2 pt-2 border-t text-green-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-sm font-medium">
                                    Đã thanh toán
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Ghi chú */}
                      {order.note && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm">
                            <strong>Ghi chú:</strong> {order.note}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailDialog(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" /> Chi tiết
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGoogleMaps(order.shippingAddress)}
                        >
                          <Navigation className="w-4 h-4 mr-2" /> Chỉ đường
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            callCustomer(order.shippingAddress.phoneNumber)
                          }
                        >
                          <Phone className="w-4 h-4 mr-2" /> Gọi khách
                        </Button>
                        {order.status === "SHIPPING" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowCompleteDialog(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Đã giao
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowReturnDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Trả hàng
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Chi tiết đơn hàng – ĐÃ THÊM phần thanh toán */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết đơn hàng #{selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về đơn hàng và sản phẩm
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Sản phẩm */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">
                  Sản phẩm ({selectedOrder.items?.length})
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex gap-3 p-3 border rounded-lg">
                      <img
                        src={item.images?.[0] || "/placeholder.png"}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* THÔNG TIN THANH TOÁN – ĐÃ THÊM */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Thông tin thanh toán</h4>

                {selectedOrder.paymentMethod === "COD" && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium text-yellow-800">
                      Thu tiền mặt khi giao:{" "}
                      {formatPrice(selectedOrder.totalAmount)}
                    </p>
                  </div>
                )}

                {selectedOrder.paymentMethod === "VNPAY" &&
                  selectedOrder.paymentInfo?.vnpayVerified && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đã thanh toán qua VNPay</span>
                      </div>
                      <p>
                        <strong>Mã GD:</strong>{" "}
                        {selectedOrder.paymentInfo.vnpayTransactionNo}
                      </p>
                      <p>
                        <strong>Ngân hàng:</strong>{" "}
                        {selectedOrder.paymentInfo.vnpayBankCode ||
                          "Không xác định"}
                      </p>
                      <p>
                        <strong>Thời gian:</strong>{" "}
                        {formatDate(selectedOrder.paymentInfo.vnpayPaidAt)}
                      </p>
                      <p className="text-green-700 font-medium mt-2">
                        Không cần thu tiền - Đã thanh toán online
                      </p>
                    </div>
                  )}

                {selectedOrder.paymentMethod === "BANK_TRANSFER" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">
                      <strong>Chuyển khoản ngân hàng</strong>
                      {selectedOrder.paymentStatus === "PAID" && (
                        <span className="text-green-600 ml-2">
                          Đã thanh toán
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Địa chỉ giao hàng */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Địa chỉ giao hàng</h4>
                <p className="font-medium">
                  {selectedOrder.shippingAddress?.fullName} -{" "}
                  {selectedOrder.shippingAddress?.phoneNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.shippingAddress?.detailAddress},{" "}
                  {selectedOrder.shippingAddress?.commune},{" "}
                  {selectedOrder.shippingAddress?.district},{" "}
                  {selectedOrder.shippingAddress?.province}
                </p>
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

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận giao hàng thành công</DialogTitle>
            <DialogDescription>
              Vui lòng nhập ghi chú (nếu có) trước khi xác nhận đơn hàng **#
              {selectedOrder?.orderNumber}** đã được giao thành công.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">
              Số tiền cần thu:{" "}
              <span className="text-red-600 font-bold">
                {selectedOrder?.paymentMethod === "COD"
                  ? formatPrice(selectedOrder.totalAmount)
                  : "0 VNĐ"}
              </span>
            </p>
            <Input
              placeholder="Ghi chú giao hàng (ví dụ: Đã nhận tiền mặt, Khách hài lòng...)"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCompleteDelivery}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận Đã giao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận trả hàng</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do trả hàng cho đơn hàng **#
              {selectedOrder?.orderNumber}**. Đơn hàng sẽ chuyển sang trạng thái
              **RETURNED**.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Lý do trả hàng (ví dụ: Khách hàng không nhận, Sai địa chỉ...)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleReturnOrder}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận Trả hàng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShipperDashboard;
