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
import EditInvoiceDialog from "@/components/pos/EditInvoiceDialog";

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
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState(null);

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

      // ✅ MỞ DIALOG CHỈNH SỬA THAY VÌ IN TRỰC TIẾP
      setOrderToPrint(selectedOrder);
      setShowEditInvoice(true);
    } catch (error) {
      console.error("Lỗi thanh toán:", error);
      toast.error(error.response?.data?.message || "Thanh toán thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HÀM IN VỚI DỮ LIỆU ĐÃ CHỈNH SỬA
  // ============================================
  const handlePrintInvoice = (editableData) => {
    const printWindow = window.open("", "", "width=800,height=1000");

    const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hóa đơn - ${editableData.orderNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          width: 210mm;
          height: 297mm;
          padding: 15mm;
          font-size: 11px;
          line-height: 1.3;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .header-left {
          flex: 1;
        }
        
        .header-left h1 {
          font-size: 18px;
          margin-bottom: 5px;
        }
        
        .header-left p {
          font-size: 10px;
          line-height: 1.4;
        }
        
        .title {
          text-align: center;
          margin-bottom: 10px;
        }
        
        .title h2 {
          font-size: 14px;
          margin-bottom: 3px;
        }
        
        .title p {
          font-size: 10px;
        }
        
        .customer-info {
          margin-bottom: 10px;
          font-size: 11px;
        }
        
        .customer-info p {
          margin-bottom: 2px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 11px;
        }
        
        th, td {
          border: 1px solid black;
          padding: 5px;
        }
        
        th {
          font-weight: bold;
          text-align: left;
        }
        
        .warranty-box {
          border: 1px solid black;
          padding: 8px;
          margin-bottom: 10px;
          font-size: 10px;
        }
        
        .warranty-box p {
          margin-bottom: 3px;
        }
        
        .warranty-box ul {
          margin-left: 15px;
          margin-top: 5px;
        }
        
        .warranty-box li {
          margin-bottom: 2px;
          line-height: 1.3;
        }
        
        .totals {
          border: 1px solid black;
          font-size: 11px;
          margin-bottom: 10px;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 5px;
          border-bottom: 1px solid black;
        }
        
        .totals-row:last-child {
          border-bottom: none;
        }
        
        .totals-highlight {
          background-color: #fef9c3;
          font-weight: bold;
        }
        
        .warning {
          text-align: center;
          margin: 8px 0;
          font-size: 11px;
          font-weight: bold;
          font-style: italic;
        }
        
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 11px;
        }
        
        .signature-box {
          text-align: center;
        }
        
        .signature-space {
          height: 60px;
        }
        
        .footer {
          text-align: center;
          font-size: 9px;
          border-top: 1px solid black;
          padding-top: 8px;
        }
        
        .footer p {
          margin-bottom: 3px;
        }
        
        @media print {
          body {
            width: 210mm;
            height: 297mm;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <h1>Ninh Kiều iSTORE</h1>
          <p>Số 58 Đường 3 Tháng 2 - Phường Xuân Khánh - Quận Ninh Kiều, Cần Thơ</p>
          <p>Hotline: 0917.755.765 - Khánh sửa: 0981.774.710</p>
        </div>
      </div>

      <!-- Title -->
      <div class="title">
        <h2>HÓA ĐƠN BÁN HÀNG KIÊM PHIẾU BẢO HÀNH</h2>
        <p>Ngày lúc ${new Date(editableData.createdAt).toLocaleString(
          "vi-VN"
        )}</p>
      </div>

      <!-- Customer Info -->
      <div class="customer-info">
        <p><strong>Tên khách hàng:</strong> ${editableData.customerName}</p>
        <p><strong>Địa chỉ:</strong> ${editableData.customerAddress}</p>
        <p><strong>Số điện thoại:</strong> ${editableData.customerPhone}</p>
      </div>

      <!-- Products Table -->
      <table>
        <thead>
          <tr>
            <th style="width: 50%">TÊN MÁY</th>
            <th style="width: 30%; text-align: center">IMEI</th>
            <th style="width: 20%; text-align: right">ĐƠN GIÁ</th>
          </tr>
        </thead>
        <tbody>
          ${editableData.items
            .map(
              (item) => `
            <tr>
              <td>
                ${item.productName}<br>
                <span style="font-size: 9px; color: #666;">
                  ${item.variantColor}${
                item.variantStorage ? " - " + item.variantStorage : ""
              }
                </span>
              </td>
              <td style="text-align: center">${item.imei || "N/A"}</td>
              <td style="text-align: right; font-weight: bold">
                ${(item.price * item.quantity).toLocaleString("vi-VN")} ₫
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <!-- Warranty Terms -->
      <div class="warranty-box">
        <p><strong>GÓI BẢO HÀNH CƠ BẢN Ninh Kieu iSTORE Care</strong></p>
        <p><strong>LƯU Ý NHỮNG TRƯỜNG HỢP KHÔNG ĐƯỢC BẢO HÀNH</strong></p>
        <ul>
          <li>Mất tem máy, rách tem</li>
          <li>Kiểm tra màn hình (trường hợp màn sọc mực, đen màn, lỗi màn hình khi ra khỏi shop sẽ không bảo hành)</li>
          <li>Máy bị phơi đơm theo giấy bảo hành KHÔNG có hữu trách nhiệm tài khoản icloud</li>
          <li>Máy rơi/va đụp, máy trả góp shop không bỏ trợ bảo an tiền</li>
        </ul>
      </div>

      <!-- Totals -->
      <div class="totals">
        <div class="totals-row">
          <span><strong>Tiền sản phẩm:</strong></span>
          <span><strong>${editableData.totalAmount.toLocaleString(
            "vi-VN"
          )} ₫</strong></span>
        </div>
        <div class="totals-row">
          <span>Voucher:</span>
          <span>0</span>
        </div>
        <div class="totals-row totals-highlight">
          <span><strong>Thành tiền:</strong></span>
          <span><strong>${editableData.totalAmount.toLocaleString(
            "vi-VN"
          )} ₫</strong></span>
        </div>
        <div class="totals-row">
          <span><strong>Tiền đã đưa:</strong></span>
          <span><strong>${editableData.paymentReceived.toLocaleString(
            "vi-VN"
          )} ₫</strong></span>
        </div>
        <div class="totals-row">
          <span>Khoản vay còn lại:</span>
          <span>0</span>
        </div>
      </div>

      <!-- Warning -->
      <div class="warning">
        CẢM ƠN QUÝ KHÁCH ĐÃ TIN TƯỞNG ỦNG HỘ Ninh Kiều iSTORE !!!
      </div>

      <!-- Signatures -->
      <div class="signatures">
        <div class="signature-box">
          <p><strong>NHÂN VIÊN</strong></p>
          <div class="signature-space"></div>
          <p>${editableData.staffName}</p>
        </div>
        <div class="signature-box">
          <p><strong>KHÁCH HÀNG</strong></p>
          <div class="signature-space"></div>
          <p>${editableData.customerName}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>BẢO HÀNH PHÂN CŨNG PHẦN MỀM TRỌNG 6 THÁNG (KHÔNG ĐỔI LỖI)</strong></p>
        <p>Xem thêm các điều khoản bảo hành tại <strong>https://itnstore.com/bao-hanh</strong></p>
      </div>
    </body>
    </html>
  `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      setShowEditInvoice(false);
    }, 500);
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
      console.error("Lỗi  :", error);
      toast.error(error.response?.data?.message || "  thất bại");
    } finally {
      setIsLoading(false);
    }
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

      <EditInvoiceDialog
        open={showEditInvoice}
        onOpenChange={setShowEditInvoice}
        order={orderToPrint}
        onPrint={handlePrintInvoice}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CASHIERDashboard;
