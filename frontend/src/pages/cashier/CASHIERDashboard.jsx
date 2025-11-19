// ============================================
// FILE: frontend/src/pages/CASHIER/CASHIERDashboard.jsx
// ✅ V2: Nhận đơn từ POS → Xử lý thanh toán → In hóa đơn
// ============================================

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Printer,
  FileText,
  DollarSign,
  Clock,
  User,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import axios from "axios";

const CASHIERDashboard = () => {
  // ============================================
  // STATE
  // ============================================
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showVATDialog, setShowVATDialog] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState("");
  const [vatForm, setVatForm] = useState({
    companyName: "",
    taxCode: "",
    companyAddress: "",
  });

  // Auto-refresh mỗi 10 giây
  useEffect(() => {
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // FETCH PENDING ORDERS
  // ============================================
  const fetchPendingOrders = async () => {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/pos/pending-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPendingOrders(response.data.data.orders || []);
    } catch (error) {
      console.error("Lỗi tải đơn:", error);
    }
  };

  // ============================================
  // XỬ LÝ THANH TOÁN
  // ============================================
  const handleOpenPayment = (order) => {
    setSelectedOrder(order);
    setPaymentReceived(order.totalAmount.toString());
    setShowPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    const received = parseFloat(paymentReceived);

    if (!received || received < selectedOrder.totalAmount) {
      toast.error("Số tiền thanh toán không đủ");
      return;
    }

    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      await axios.post(
        `${import.meta.env.VITE_API_URL}/pos/process-payment/${
          selectedOrder._id
        }`,
        { paymentReceived: received },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Thanh toán thành công!");
      setShowPaymentDialog(false);
      fetchPendingOrders();

      // In hóa đơn
      printInvoice(selectedOrder, received);
    } catch (error) {
      console.error("Lỗi thanh toán:", error);
      toast.error(error.response?.data?.message || "Thanh toán thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HỦY ĐƠN
  // ============================================
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) return;

    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const reason = prompt("Lý do hủy đơn:");
      if (!reason) return;

      await axios.post(
        `${import.meta.env.VITE_API_URL}/pos/cancel-order/${orderId}`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Đã hủy đơn hàng");
      fetchPendingOrders();
    } catch (error) {
      console.error("Lỗi hủy đơn:", error);
      toast.error(error.response?.data?.message || "Hủy đơn thất bại");
    }
  };

  // ============================================
  // XUẤT HÓA ĐƠN VAT
  // ============================================
  const handleOpenVAT = (order) => {
    setSelectedOrder(order);
    setVatForm({ companyName: "", taxCode: "", companyAddress: "" });
    setShowVATDialog(true);
  };

  const handleIssueVAT = async () => {
    if (!vatForm.companyName || !vatForm.taxCode) {
      toast.error("Vui lòng nhập đầy đủ thông tin công ty");
      return;
    }

    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      await axios.post(
        `${import.meta.env.VITE_API_URL}/pos/issue-vat/${selectedOrder._id}`,
        vatForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Xuất hóa đơn VAT thành công!");
      setShowVATDialog(false);
    } catch (error) {
      console.error("Lỗi xuất VAT:", error);
      toast.error(error.response?.data?.message || "Xuất VAT thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // IN HÓA ĐƠN
  // ============================================
  const printInvoice = (order, paymentReceived) => {
    const changeGiven = Math.max(0, paymentReceived - order.totalAmount);

    // ✅ FALLBACK cho cashierName
    const cashierName =
      order.posInfo?.cashierName ||
      order.paymentInfo?.processedBy?.fullName ||
      order.posInfo?.staffName ||
      "Thu ngân";
    const printWindow = window.open("", "", "width=800,height=600");
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn - ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; }
          td { padding: 10px; border: 1px solid #ddd; }
          .text-right { text-align: right; }
          .total-section { margin-top: 20px; float: right; width: 300px; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .grand-total { border-top: 2px solid #000; padding-top: 10px; font-size: 18px; font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <h1>HÓA ĐƠN BÁN HÀNG</h1>
          <p>Apple Store Cần Thơ</p>
          <p>Địa chỉ: Xuân Khánh, Ninh Kiều, Cần Thơ | Hotline: 1900.xxxx</p>
        </div>

        <!-- Order Info -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Số đơn hàng:</span>
            <span>${order.orderNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ngày:</span>
            <span>${formatDate(new Date())}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nhân viên bán:</span>
            <span>${order.posInfo?.staffName || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Thu ngân:</span>
            <span>${cashierName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Khách hàng:</span>
            <span>${order.shippingAddress.fullName} - ${
      order.shippingAddress.phoneNumber
    }</span>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Sản phẩm</th>
              <th class="text-right">SL</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  ${item.productName}<br>
                  <small>${item.variantColor}${
                  item.variantStorage ? " • " + item.variantStorage : ""
                }</small>
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatPrice(item.price)}</td>
                <td class="text-right">${formatPrice(item.total)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <!-- Total Section -->
        <div class="total-section">
          <div class="total-row">
            <span>Tạm tính:</span>
            <span>${formatPrice(order.totalAmount)}</span>
          </div>
          <div class="total-row grand-total">
            <span>Tổng cộng:</span>
            <span>${formatPrice(order.totalAmount)}</span>
          </div>
          <div class="total-row">
            <span>Tiền khách đưa:</span>
            <span>${formatPrice(paymentReceived)}</span>
          </div>
          <div class="total-row" style="color: green;">
            <span>Tiền thối lại:</span>
            <span>${formatPrice(changeGiven)}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        <!-- Footer -->
        <div class="footer">
          <p>Cảm ơn quý khách đã mua hàng!</p>
          <p>Bảo hành 12 tháng chính hãng Apple | Đổi trả trong 30 ngày</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Xử lý thanh toán</h1>
          <p className="text-muted-foreground">
            Đơn hàng chờ thanh toán từ POS
          </p>
        </div>
        <Button onClick={fetchPendingOrders} variant="outline">
          Làm mới
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Đơn chờ xử lý
                </p>
                <h3 className="text-3xl font-bold">{pendingOrders.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Tổng giá trị
                </p>
                <h3 className="text-2xl font-bold">
                  {formatPrice(
                    pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0)
                  )}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Đơn hôm nay
                </p>
                <h3 className="text-3xl font-bold">
                  {
                    pendingOrders.filter((o) => {
                      const today = new Date().toDateString();
                      return new Date(o.createdAt).toDateString() === today;
                    }).length
                  }
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Đơn hàng chờ thanh toán
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <p className="text-xl font-semibold mb-2">
                Không có đơn chờ xử lý
              </p>
              <p className="text-muted-foreground">
                Tất cả đơn hàng đã được thanh toán
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <Card
                  key={order._id}
                  className="border-2 border-orange-200 bg-orange-50/30"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className="bg-orange-500">
                            CHỜ THANH TOÁN
                          </Badge>
                          <p className="font-bold text-lg">
                            {order.orderNumber}
                          </p>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Nhân viên
                            </p>
                            <p className="font-medium flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {order.posInfo.staffName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Khách hàng
                            </p>
                            <p className="font-medium">
                              {order.shippingAddress.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.shippingAddress.phoneNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Số lượng
                            </p>
                            <p className="font-medium">
                              {order.items.length} sản phẩm
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Tổng tiền
                            </p>
                            <p className="text-xl font-bold text-primary">
                              {formatPrice(order.totalAmount)}
                            </p>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Sản phẩm:</p>
                          <div className="space-y-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <p
                                key={idx}
                                className="text-sm text-muted-foreground"
                              >
                                • {item.productName} ({item.variantColor}) - SL:{" "}
                                {item.quantity}
                              </p>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-sm text-muted-foreground">
                                ... và {order.items.length - 3} sản phẩm khác
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleOpenPayment(order)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Thanh toán
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleCancelOrder(order._id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Hủy đơn
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý thanh toán</DialogTitle>
            <DialogDescription>
              Đơn hàng: {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tổng tiền</p>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(selectedOrder.totalAmount)}
                </p>
              </div>

              <div>
                <Label htmlFor="paymentReceived">Tiền khách đưa *</Label>
                <Input
                  id="paymentReceived"
                  type="number"
                  value={paymentReceived}
                  onChange={(e) => setPaymentReceived(e.target.value)}
                  placeholder="0"
                  className="text-lg font-bold"
                />
              </div>

              {paymentReceived && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Tiền thối lại
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(
                      Math.max(0, paymentReceived - selectedOrder.totalAmount)
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleProcessPayment} disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Xác nhận thanh toán"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VAT Dialog */}
      <Dialog open={showVATDialog} onOpenChange={setShowVATDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất hóa đơn VAT</DialogTitle>
            <DialogDescription>
              Đơn hàng: {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName">Tên công ty *</Label>
              <Input
                id="companyName"
                placeholder="Công ty TNHH ABC"
                value={vatForm.companyName}
                onChange={(e) =>
                  setVatForm({ ...vatForm, companyName: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="taxCode">Mã số thuế *</Label>
              <Input
                id="taxCode"
                placeholder="0123456789"
                value={vatForm.taxCode}
                onChange={(e) =>
                  setVatForm({ ...vatForm, taxCode: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="companyAddress">Địa chỉ</Label>
              <Input
                id="companyAddress"
                placeholder="123 Đường ABC..."
                value={vatForm.companyAddress}
                onChange={(e) =>
                  setVatForm({ ...vatForm, companyAddress: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVATDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleIssueVAT} disabled={isLoading}>
              {isLoading ? "Đang xuất..." : "Xuất hóa đơn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CASHIERDashboard;
