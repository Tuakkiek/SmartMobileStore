// ============================================
// FILE: src/pages/customer/OrderDetailPage.jsx
// COMPLETE: Full variant info + promotion + accurate total
// ============================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ArrowLeft, MapPin, CreditCard, Package } from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

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
    } catch (error) {
      alert(error.response?.data?.message || "Hủy đơn hàng thất bại");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/orders")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Quay lại
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.variantId || item._id}
                  className="flex gap-4 pb-4 border-b last:border-0"
                >
                  <img
                    src={item.images?.[0] || "/placeholder.png"}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{item.productName}</h4>

                    {/* VARIANT INFO */}
                    <div className="flex gap-2 text-sm text-muted-foreground mb-1">
                      {item.variantColor && (
                        <span>Màu: {item.variantColor}</span>
                      )}
                      {item.variantStorage && (
                        <span>• {item.variantStorage}</span>
                      )}
                      {item.variantConnectivity && (
                        <span>• {item.variantConnectivity}</span>
                      )}
                      {item.variantName && <span>• {item.variantName}</span>}
                    </div>

                    <p className="text-sm mt-1">Số lượng: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(item.price)}</p>
                    {item.originalPrice > item.price && (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(item.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* PROMOTION BOX NẾU CÓ */}
              {order.appliedPromotion && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        Mã giảm giá: {order.appliedPromotion.code}
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
              <p>{getStatusText(order.paymentMethod)}</p>
              <Badge className={`mt-2 ${getStatusColor(order.paymentStatus)}`}>
                {getStatusText(order.paymentStatus)}
              </Badge>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Lịch sử đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.statusHistory?.map((history, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0 ? "bg-primary" : "bg-muted"
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
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Tổng quan đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tổng tiền chi tiết */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span className="text-green-600">
                    {order.shippingFee === 0
                      ? "Miễn phí"
                      : formatPrice(order.shippingFee)}
                  </span>
                </div>
                {order.promotionDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span>-{formatPrice(order.promotionDiscount)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Tổng cộng</span>
                    <span className="text-primary">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
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
