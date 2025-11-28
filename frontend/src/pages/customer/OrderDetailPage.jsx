// ============================================
// FILE: frontend/src/pages/customer/OrderDetailPage.jsx
// ✅ ADDED: Invoice export button for paid orders
// ✅ FIXED: Show VNPay payment status clearly
// ============================================
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Imports mới cho AlertDialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Package,
  XCircle,
  RotateCcw,
  Download,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";
import { toast } from "sonner";
import InvoiceTemplate from "@/components/pos/InvoiceTemplate";
// ✅ No external library needed for printing
const PlaceholderImg = "https://via.placeholder.com/80?text=No+Image";
const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  // === State mới cho AlertDialog ===
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  // ==================================
  const invoiceRef = useRef();
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
  const handleCancelOrder = () => {
    setShowCancelDialog(true);
  };
  const handleConfirmCancel = async () => {
    setShowCancelDialog(false);
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
  const handlePrint = () => {
    const printContent = invoiceRef.current;
    const winPrint = window.open("", "", "width=900,height=650");
    winPrint.document.write("<html><head><title>Invoice</title>");
    winPrint.document.write(
      "<style>body { font-family: Arial, sans-serif; }</style>"
    );
    winPrint.document.write("</head><body>");
    winPrint.document.write(printContent.innerHTML);
    winPrint.document.write("</body></html>");
    winPrint.document.close();
    winPrint.focus();
    winPrint.print();
    winPrint.close();
    toast.success("Đã in hóa đơn thành công");
  };
  const handleExportInvoice = () => {
    setShowInvoiceDialog(true);
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
  const isCancelled = order.status === "CANCELLED";
  const isReturned = order.status === "RETURNED";
  const isPaymentVerified =
    order.status === "PAYMENT_VERIFIED" || order.paymentInfo?.vnpayVerified;
  const canExportInvoice =
    order.paymentStatus === "PAID" && order.orderSource === "ONLINE";
  // ✅ Prepare invoice data
  const invoiceData = {
    customerName: order.shippingAddress?.fullName,
    customerPhone: order.shippingAddress?.phoneNumber,
    customerAddress: `${order.shippingAddress?.detailAddress}, ${order.shippingAddress?.ward}, ${order.shippingAddress?.province}`,
    items: order.items.map((item) => ({
      ...item,
      imei: item.imei || "N/A",
    })),
    totalAmount: order.totalAmount,
    paymentReceived: order.totalAmount,
    changeGiven: 0,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    staffName: "Hệ thống",
    cashierName: order.paymentMethod === "VNPAY" ? "VNPay" : "N/A",
  };
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
      {/* ✅ PAYMENT VERIFIED BANNER */}
      {isPaymentVerified && !isCancelled && !isReturned && (
        <div className="mb-6 rounded-lg border-2 bg-green-50 border-green-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 text-green-900">
                Thanh toán VNPay thành công
              </h3>
              <p className="text-sm text-green-700">
                Đơn hàng đã được thanh toán qua VNPay. Chúng tôi sẽ xử lý và
                giao hàng trong thời gian sớm nhất.
              </p>
              {order.paymentInfo?.vnpayTransactionNo && (
                <div className="mt-3 p-3 bg-white border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-gray-700">
                    Mã giao dịch VNPay:
                  </p>
                  <p className="text-sm text-gray-600 mt-1 font-mono">
                    {order.paymentInfo.vnpayTransactionNo}
                  </p>
                </div>
              )}
              {order.paymentInfo?.vnpayPaidAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Thời gian thanh toán:{" "}
                  {formatDate(order.paymentInfo.vnpayPaidAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* CANCELLED/RETURNED BANNER */}
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
                  ? "Đơn hàng này đã bị hủy và không thể khôi phục."
                  : "Đơn hàng đã được hoàn trả."}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* ORDER INFO */}
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
          {/* ORDER ITEMS */}
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
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(item.total || item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          {/* SHIPPING ADDRESS */}
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
                {order.shippingAddress.ward}, {order.shippingAddress.province}
              </p>
            </CardContent>
          </Card>
          {/* PAYMENT METHOD */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Phương thức thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{getStatusText(order.paymentMethod)}</p>
              {order.paymentMethod === "VNPAY" &&
                order.paymentInfo?.vnpayBankCode && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Ngân hàng: {order.paymentInfo.vnpayBankCode}
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
        {/* SIDEBAR */}
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
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span
                    className={order.shippingFee === 0 ? "text-green-600" : ""}
                  >
                    {order.shippingFee === 0
                      ? "Miễn phí"
                      : formatPrice(order.shippingFee)}
                  </span>
                </div>
                {/* ✅ THÊM ĐOẠN NÀY */}
                {order.promotionDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Mã giảm giá{" "}
                      {order.appliedPromotion?.code &&
                        `(${order.appliedPromotion.code})`}
                    </span>
                    <span className="text-green-600 font-medium">
                      -{formatPrice(order.promotionDiscount)}
                    </span>
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
              {/* ✅ EXPORT INVOICE BUTTON */}
              {canExportInvoice && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleExportInvoice}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Xuất hóa đơn
                </Button>
              )}
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
            </CardContent>
          </Card>
        </div>
      </div>
      {/* ✅ INVOICE DIALOG */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hóa đơn đơn hàng #{order.orderNumber}</DialogTitle>
          </DialogHeader>
          <div ref={invoiceRef}>
            <InvoiceTemplate
              order={order}
              editableData={invoiceData}
              storeInfo={{}}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(false)}
            >
              Đóng
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              In hóa đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* === AlertDialog Xác Nhận Hủy Đơn Hàng MỚI === */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy đơn hàng này? <br />
              <span className="text-red-600 font-medium">
                Hành động này sẽ không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default OrderDetailPage;
