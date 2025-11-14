// src/pages/customer/OrderDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Package,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";
import { toast } from "sonner";

const PlaceholderImg = "https://via.placeholder.com/80?text=No+Image";

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const response = await orderAPI.getById(id);
      setOrder(response.data.data.order);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;

    setIsCancelling(true);
    try {
      await orderAPI.cancel(id);
      await fetchOrder();
      toast.success("Đã hủy đơn hàng thành công");
    } catch (error) {
      toast.error(error.response?.data?.message || "Hủy đơn hàng thất bại");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) return <Loading />;
  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Không tìm thấy đơn hàng</p>
        <Button onClick={() => navigate("/orders")} className="mt-4">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const getImageUrl = (path) => {
    if (!path) return PlaceholderImg;
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_API_URL}${
      path.startsWith("/") ? "" : "/"
    }${path}`;
  };

  const getVariantLabel = (item) => {
    const parts = [];
    if (item.variantColor) parts.push(item.variantColor);
    if (item.variantStorage) parts.push(item.variantStorage);
    if (item.variantName) parts.push(item.variantName);
    if (item.variantConnectivity) parts.push(item.variantConnectivity);
    return parts.length > 0 ? parts.join(" • ") : null;
  };

  // ✅ Kiểm tra trạng thái đơn hủy/trả
  const isCancelled = order.status === "CANCELLED";
  const isReturned = order.status === "RETURNED";

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/profile")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Quay lại
      </Button>

      {/* ✅ BANNER CẢNH BÁO KHI ĐƠN BỊ HỦY/TRẢ */}
      {(isCancelled || isReturned) && (
        <div
          className={`mb-6 rounded-lg border-2 p-6 ${
            isCancelled
              ? "bg-red-50 border-red-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCancelled ? "bg-red-100" : "bg-orange-100"
              }`}
            >
              {isCancelled ? (
                <XCircle className="w-6 h-6 text-red-600" />
              ) : (
                <RotateCcw className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`text-lg font-bold mb-2 ${
                  isCancelled ? "text-red-900" : "text-orange-900"
                }`}
              >
                {isCancelled
                  ? "Đơn hàng đã bị hủy"
                  : "Đơn hàng đã được trả lại"}
              </h3>
              <p
                className={`text-sm ${
                  isCancelled ? "text-red-700" : "text-orange-700"
                }`}
              >
                {isCancelled
                  ? "Đơn hàng này đã bị hủy và không thể khôi phục. Nếu bạn vẫn muốn mua sản phẩm, vui lòng đặt hàng mới."
                  : "Đơn hàng đã được hoàn trả. Số tiền sẽ được hoàn lại trong 3-5 ngày làm việc."}
              </p>
              {order.cancelReason && (
                <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Lý do:</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.cancelReason}
                  </p>
                </div>
              )}
              {order.cancelledAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Thời gian: {formatDate(order.cancelledAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <Card className={isCancelled || isReturned ? "opacity-75" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="mb-2">
                    Đơn hàng #{order.orderNumber}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Đặt ngày {formatDate(order.createdAt)}
                  </p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusText(order.status)}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Order Items */}
          <Card className={isCancelled || isReturned ? "opacity-75" : ""}>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, idx) => {
                const imageUrl = item.images?.[0]
                  ? getImageUrl(item.images[0])
                  : PlaceholderImg;
                const variantLabel = getVariantLabel(item);

                return (
                  <div
                    key={item._id || idx}
                    className="flex gap-4 pb-4 border-b last:border-0 relative"
                  >
                    {/* ✅ Overlay khi đơn bị hủy */}
                    {(isCancelled || isReturned) && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                        <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-semibold text-sm">
                          {isCancelled ? "Đã hủy" : "Đã trả"}
                        </div>
                      </div>
                    )}

                    <img
                      src={imageUrl}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded bg-gray-100"
                      onError={(e) => {
                        e.target.src = PlaceholderImg;
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      {variantLabel && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {variantLabel}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        SL: {item.quantity} x {formatPrice(item.price)}
                      </p>
                      {item.originalPrice > item.price && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(item.originalPrice)} mỗi
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(item.total || item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* PROMOTION BOX */}
              {order.appliedPromotion && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        Mã: {order.appliedPromotion.code}
                      </p>
                      <p className="text-sm text-green-600">
                        Giảm:{" "}
                        {formatPrice(order.appliedPromotion.discountAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Địa chỉ giao hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-1">
                {order.shippingAddress.fullName}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                {order.shippingAddress.phoneNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.detailAddress},{" "}
                {order.shippingAddress.commune},{" "}
                {order.shippingAddress.district},{" "}
                {order.shippingAddress.province}
              </p>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Phương thức thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                {order.paymentMethod === "COD"
                  ? "Thanh toán khi nhận hàng"
                  : "Chuyển khoản"}
              </p>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          {order.statusHistory?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Lịch sử đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.statusHistory.map((history, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            index === order.statusHistory.length - 1
                              ? isCancelled || isReturned
                                ? "bg-red-500"
                                : "bg-primary"
                              : "bg-muted"
                          }`}
                        />
                        {index < order.statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-muted mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <Badge className={getStatusColor(history.status)}>
                          {getStatusText(history.status)}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(history.updatedAt)}
                        </p>
                        {history.note && (
                          <p className="text-sm mt-1">{history.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card
            className={`sticky top-20 ${
              isCancelled || isReturned ? "border-2 border-red-200" : ""
            }`}
          >
            <CardHeader>
              <CardTitle>Tổng quan đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span
                    className={
                      isCancelled || isReturned
                        ? "line-through text-gray-400"
                        : ""
                    }
                  >
                    {formatPrice(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span
                    className={`${
                      order.shippingFee === 0 ? "text-green-600" : ""
                    } ${
                      isCancelled || isReturned
                        ? "line-through text-gray-400"
                        : ""
                    }`}
                  >
                    {order.shippingFee === 0
                      ? "Miễn phí"
                      : formatPrice(order.shippingFee)}
                  </span>
                </div>
                {order.promotionDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span
                      className={
                        isCancelled || isReturned
                          ? "line-through text-gray-400"
                          : ""
                      }
                    >
                      -{formatPrice(order.promotionDiscount)}
                    </span>
                  </div>
                )}
                {order.pointsUsed > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Điểm thưởng</span>
                    <span
                      className={
                        isCancelled || isReturned
                          ? "line-through text-gray-400"
                          : ""
                      }
                    >
                      -{formatPrice(order.pointsUsed)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Tổng cộng</span>
                    <span
                      className={
                        isCancelled || isReturned
                          ? "line-through text-gray-400"
                          : "text-primary"
                      }
                    >
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                  {(isCancelled || isReturned) && (
                    <p className="text-sm text-red-600 text-right mt-1 font-medium">
                      {isCancelled
                        ? "Đã hủy - Không thanh toán"
                        : "Đã hoàn tiền"}
                    </p>
                  )}
                </div>
              </div>

              {order.status === "PENDING" && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Đang hủy..." : "Hủy đơn hàng"}
                </Button>
              )}

              {/* ✅ NÚT MUA LẠI KHI ĐƠN BỊ HỦY */}
              {(isCancelled || isReturned) && (
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => navigate("/products")}
                >
                  Mua lại sản phẩm
                </Button>
              )}

              {order.note && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Ghi chú</h4>
                  <p className="text-sm text-muted-foreground">{order.note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
