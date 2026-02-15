import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate, getStatusColor, getStatusStage, getStatusText } from "@/lib/utils";
import { MapPin, User, Phone, Truck, Clock } from "lucide-react";

const OrderDetailDialog = ({ order, open, onClose }) => {
  if (!order) return null;
  const stage = order.statusStage || getStatusStage(order.status);

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/100?text=No+Image";
    if (path.startsWith("http")) return path;
    const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng #{order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(stage)}>
              {getStatusText(stage)}
            </Badge>
            {order.status && stage !== order.status && (
              <Badge variant="outline">
                Chi tiết: {getStatusText(order.status)}
              </Badge>
            )}
            {order.paymentMethod === "VNPAY" && order.paymentInfo?.vnpayVerified && (
              <Badge className="bg-green-100 text-green-800">
                Đã thanh toán VNPay
              </Badge>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm space-y-1">
            <p>
              <strong>Hình thức nhận:</strong>{" "}
              {getStatusText(order.fulfillmentType || "HOME_DELIVERY")}
            </p>
            {order.assignedStore?.storeName && (
              <p>
                <strong>Cửa hàng xử lý:</strong> {order.assignedStore.storeName}
              </p>
            )}
            {order.pickupInfo?.pickupCode && (
              <p>
                <strong>Mã nhận hàng:</strong> {order.pickupInfo.pickupCode}
              </p>
            )}
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-3">Sản phẩm trong đơn</h3>
            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 border rounded-lg">
                  <img
                    src={getImageUrl(item.images?.[0])}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
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

          {/* Shipping/Pickup Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {order.fulfillmentType === "CLICK_AND_COLLECT"
                ? "Thông tin nhận tại cửa hàng"
                : "Địa chỉ giao hàng"}
            </h3>
            {order.fulfillmentType === "CLICK_AND_COLLECT" ? (
              <>
                <p>
                  {order.assignedStore?.storeName || "Chưa gán cửa hàng"} -{" "}
                  {order.assignedStore?.storePhone || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.assignedStore?.storeAddress || "N/A"}
                </p>
              </>
            ) : (
              <>
                <p>
                  {order.shippingAddress?.fullName} - {order.shippingAddress?.phoneNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress?.detailAddress}, {order.shippingAddress?.ward}, {order.shippingAddress?.province}
                </p>
              </>
            )}
          </div>

          {/* ✅ NEW: Shipper Info */}
          {order.shipperInfo && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-800">
                <Truck className="w-4 h-4" />
                Thông tin người giao hàng
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span><strong>Shipper:</strong> {order.shipperInfo.shipperName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span><strong>SĐT:</strong> {order.shipperInfo.shipperPhone}</span>
                </div>
                {order.shipperInfo.pickupAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span><strong>Nhận hàng:</strong> {formatDate(order.shipperInfo.pickupAt)}</span>
                  </div>
                )}
                {order.shipperInfo.deliveredAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span><strong>Giao hàng:</strong> {formatDate(order.shipperInfo.deliveredAt)}</span>
                  </div>
                )}
                {order.shipperInfo.deliveryNote && (
                  <p className="mt-2 p-2 bg-white rounded border">
                    <strong>Ghi chú:</strong> {order.shipperInfo.deliveryNote}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* VNPay Payment Info */}
          {order.paymentMethod === "VNPAY" && order.paymentInfo?.vnpayTransactionNo && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-2 text-green-800">
                Thông tin thanh toán VNPay
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Mã giao dịch:</strong> {order.paymentInfo.vnpayTransactionNo}</p>
                <p><strong>Ngân hàng:</strong> {order.paymentInfo.vnpayBankCode || "Không rõ"}</p>
                <p><strong>Thời gian thanh toán:</strong> {formatDate(order.paymentInfo.vnpayPaidAt)}</p>
                <p><strong>Trạng thái:</strong> <span className="text-green-700 font-medium">Đã xác nhận</span></p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí ship:</span>
              <span>{formatPrice(order.shippingFee)}</span>
            </div>
            {order.promotionDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá:</span>
                <span>-{formatPrice(order.promotionDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Tổng:</span>
              <span className="text-primary">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* POS Info */}
          {order.posInfo && (
            <div className="p-4 bg-blue-50 rounded-lg text-sm">
              <p><strong>Nhân viên tạo:</strong> {order.posInfo.staffName}</p>
              {order.posInfo.cashierName && (
                <p><strong>Thu ngân:</strong> {order.posInfo.cashierName}</p>
              )}
              {order.posInfo.paymentReceived && (
                <>
                  <p><strong>Tiền khách đưa:</strong> {formatPrice(order.posInfo.paymentReceived)}</p>
                  <p><strong>Tiền thối:</strong> {formatPrice(order.posInfo.changeGiven || 0)}</p>
                </>
              )}
              {order.posInfo.receiptNumber && (
                <p><strong>Số phiếu:</strong> {order.posInfo.receiptNumber}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
