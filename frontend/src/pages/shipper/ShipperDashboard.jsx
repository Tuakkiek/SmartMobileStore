// ============================================
// FILE: frontend/src/pages/shipper/ShipperDashboard.jsx
// Trang quản lý giao hàng cho Shipper
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
  TrendingUp,
  AlertCircle,
  Camera,
  FileText,
} from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

const ShipperDashboard = () => {
  /* ------------------------------------------------------------------ */
  /* 1. STATE – dữ liệu thô & UI */
  /* ------------------------------------------------------------------ */
  const [rawOrders, setRawOrders] = useState([]); // toàn bộ 3 trạng thái
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

  /* ------------------------------------------------------------------ */
  /* 2. FETCH – chỉ gọi 1 lần (hoặc khi refresh) */
  /* ------------------------------------------------------------------ */
  const fetchAllOrders = async () => {
    setIsLoading(true);
    try {
      const statusList = ["SHIPPING", "DELIVERED", "RETURNED"];
      const promises = statusList.map((status) =>
        orderAPI.getAll({ status, limit: 200 })
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
  }, []); // chỉ mount 1 lần

  /* ------------------------------------------------------------------ */
  /* 3. PHÂN LOẠI ĐƠN HÀNG */
  /* ------------------------------------------------------------------ */
  const { pendingOrders, completedOrders, returnedOrders } = useMemo(() => {
    const todayStr = new Date().toDateString();

    const pending = rawOrders.filter(
      (o) =>
        o.status === "SHIPPING" &&
        new Date(o.createdAt).toDateString() === todayStr
    );
    const completed = rawOrders.filter(
      (o) =>
        o.status === "DELIVERED" &&
        new Date(o.createdAt).toDateString() === todayStr
    );
    const returned = rawOrders.filter(
      (o) =>
        o.status === "RETURNED" &&
        new Date(o.createdAt).toDateString() === todayStr
    );

    return {
      pendingOrders: pending,
      completedOrders: completed,
      returnedOrders: returned,
    };
  }, [rawOrders]);

  /* ------------------------------------------------------------------ */
  /* 4. TÍNH TOÁN STATISTICS (luôn dựa trên dữ liệu hôm nay) */
  /* ------------------------------------------------------------------ */
  const stats = useMemo(() => {
    return {
      totalToday:
        pendingOrders.length + completedOrders.length + returnedOrders.length,
      pending: pendingOrders.length,
      completed: completedOrders.length,
      failed: returnedOrders.length,
    };
  }, [pendingOrders, completedOrders, returnedOrders]);

  /* ------------------------------------------------------------------ */
  /* 5. LỌC ĐƠN HÀNG THEO TAB & SEARCH */
  /* ------------------------------------------------------------------ */
  const currentOrders = {
    pending: pendingOrders,
    completed: completedOrders,
    returned: returnedOrders,
  }[activeTab];

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return currentOrders;
    const q = searchQuery.toLowerCase();
    return currentOrders.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.shippingAddress?.fullName?.toLowerCase().includes(q) ||
        o.shippingAddress?.phoneNumber?.includes(q)
    );
  }, [currentOrders, searchQuery]);

  /* ------------------------------------------------------------------ */
  /* 6. HÀM XỬ LÝ HOÀN THÀNH / TRẢ HÀNG */
  /* ------------------------------------------------------------------ */
  const refreshAfterAction = () => {
    // chỉ reload dữ liệu của trạng thái vừa thay đổi
    fetchAllOrders();
  };

  const handleCompleteDelivery = async () => {
    if (!completionNote.trim()) {
      toast.error("Vui lòng nhập ghi chú giao hàng");
      return;
    }
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
    if (!returnReason.trim()) {
      toast.error("Vui lòng nhập lý do trả hàng");
      return;
    }
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

  /* ------------------------------------------------------------------ */
  /* 7. HÀM HỖ TRỢ */
  /* ------------------------------------------------------------------ */
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
  /* 8. RENDER */
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Tìm kiếm theo mã đơn, tên hoặc số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

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
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "Bạn chưa có đơn hàng nào cần giao"
                    : activeTab === "completed"
                    ? "Chưa có đơn hàng nào đã giao"
                    : "Chưa có đơn hàng nào bị trả"}
                </p>
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
                      {/* Thông tin khách */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            Thông tin giao hàng
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

                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Chi tiết đơn hàng
                          </h4>
                          <div className="pl-6 space-y-1 text-sm">
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
                              >
                                {getStatusText(order.paymentMethod)}
                              </Badge>
                            </div>
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
                          onClick={() =>
                            setSelectedOrder(order) || setShowDetailDialog(true)
                          }
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Chi tiết
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGoogleMaps(order.shippingAddress)}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Chỉ đường
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            callCustomer(order.shippingAddress.phoneNumber)
                          }
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Gọi khách
                        </Button>

                        {order.status === "SHIPPING" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() =>
                                setSelectedOrder(order) ||
                                setShowCompleteDialog(true)
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Đã giao
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setSelectedOrder(order) ||
                                setShowReturnDialog(true)
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Trả hàng
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

      {/* Order Detail Dialog */}
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Trạng thái</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {getStatusText(selectedOrder.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Ngày tạo</p>
                  <p className="font-medium">
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">
                  Sản phẩm ({selectedOrder.items?.length})
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-3 p-3 border rounded-lg">
                      <img
                        src={item.images?.[0] || "/placeholder.png"}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded"
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
                        <p className="text-sm">SL: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng tiền:</span>
                  <span className="text-primary">
                    {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailDialog(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Delivery Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Xác nhận giao hàng thành công</DialogTitle>
            <DialogDescription>
              Đơn hàng: #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm">
                <strong>Khách hàng:</strong>{" "}
                {selectedOrder?.shippingAddress?.fullName}
              </p>
              <p className="text-sm">
                <strong>Tổng tiền:</strong>{" "}
                {formatPrice(selectedOrder?.totalAmount)}
              </p>
              {selectedOrder?.paymentMethod === "COD" && (
                <p className="text-sm text-red-600 font-bold mt-2">
                  ⚠️ Nhớ thu tiền mặt: {formatPrice(selectedOrder?.totalAmount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ghi chú giao hàng *</label>
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Ví dụ: Đã giao cho khách tại nhà, thu tiền mặt đầy đủ"
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={3}
                required
              />
            </div>
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
              disabled={isSubmitting || !completionNote.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận đã giao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Order Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Xác nhận trả hàng</DialogTitle>
            <DialogDescription>
              Đơn hàng: #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Lưu ý khi trả hàng:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Khách hàng từ chối nhận hàng</li>
                    <li>Không liên lạc được với khách</li>
                    <li>Địa chỉ không chính xác</li>
                    <li>Khách yêu cầu đổi/trả</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do trả hàng *</label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleReturnOrder}
              disabled={isSubmitting || !returnReason.trim()}
              variant="destructive"
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận trả hàng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShipperDashboard;
