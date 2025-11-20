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

      const response = await axios.post(
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

      // ✅ SỬA: Set orderToPrint với data từ response (có paymentReceived)
      // Thay vì dùng selectedOrder cũ
      setOrderToPrint(response.data.data.order); // ← THAY ĐỔI NÀY
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
  const handlePrintInvoice = async (editableData) => {
    // ✅ BƯỚC 1: Tạo HTML hóa đơn
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn - ${editableData.orderNumber}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; width: 210mm; margin: 0 auto; padding: 15mm 15mm; font-size: 11px; line-height: 1.3; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-start { align-items: flex-start; }
          .mb-3 { margin-bottom: 0.75rem; }
          .flex-1 { flex: 1; }
          .text-lg { font-size: 1.125rem; }
          .font-bold { font-weight: bold; }
          .mb-1 { margin-bottom: 0.25rem; }
          .text-xs { font-size: 0.75rem; }
          .leading-tight { line-height: 1.25; }
          .w-16 { width: 4rem; }
          .h-16 { height: 4rem; }
          .border { border-width: 1px; }
          .border-black { border-color: black; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .text-[8px] { font-size: 0.5rem; }
          .text-center { text-align: center; }
          .text-base { font-size: 1rem; }
          .space-y-0.5 > * + * { margin-top: 0.125rem; }
          .font-semibold { font-weight: 600; }
          .w-full { width: 100%; }
          .border-b { border-bottom-width: 1px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-r { border-right-width: 1px; }
          .p-1.5 { padding: 0.375rem; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .w-32 { width: 8rem; }
          .w-24 { width: 6rem; }
          .text-[10px] { font-size: 0.625rem; }
          .text-gray-600 { color: #4b5563; }
          .p-2 { padding: 0.5rem; }
          .list-disc { list-style-type: disc; }
          .ml-4 { margin-left: 1rem; }
          .space-y-0.5 > * + * { margin-top: 0.125rem; }
          .bg-yellow-50 { background-color: #fdfce5; }
          .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
          .italic { font-style: italic; }
          .mb-12 { margin-bottom: 3rem; }
          .border-t { border-top-width: 1px; }
          .pt-2 { padding-top: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="bg-white mx-auto">
          <!-- Header -->
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <h1 class="text-lg font-bold mb-1">Ninh Kiều iSTORE</h1>
              <p class="text-xs leading-tight">Số 58 Đường 3 Tháng 2 - Phường Xuân Khánh - Quận Ninh Kiều, Cần Thơ</p>
              <p class="text-xs">
                Hotline: 0917.755.765 - Khánh sửa: 0981.774.710
              </p>
            </div>
            <div class="w-16 h-16 border border-black flex items-center justify-center flex-shrink-0">
            </div>
          </div>

          <!-- Title -->
          <div class="text-center mb-3">
            <h2 class="text-base font-bold">
              HÓA ĐƠN BÁN HÀNG KIÊM PHIẾU BẢO HÀNH
            </h2>
            <p class="text-xs">Ngày lúc ${formatDate(
              editableData.createdAt
            )}</p>
          </div>

          <!-- Customer Info -->
          <div class="mb-3 space-y-0.5 text-xs">
            <p>
              <span class="font-semibold">Tên khách hàng:</span> ${
                editableData.customerName
              }
            </p>
            <p>
              <span class="font-semibold">Địa chỉ:</span> ${
                editableData.customerAddress
              }
            </p>
            <p>
              <span class="font-semibold">Số điện thoại:</span> ${
                editableData.customerPhone
              }
            </p>
          </div>

          <!-- Products Table -->
          <table class="w-full border border-black mb-3 text-xs">
            <thead>
              <tr class="border-b border-black">
                <th class="border-r border-black p-1.5 text-left font-bold">
                  TÊN MÁY
                </th>
                <th class="border-r border-black p-1.5 text-center font-bold w-32">
                  IMEI
                </th>
                <th class="p-1.5 text-right font-bold w-24">ĐƠN GIÁ</th>
              </tr>
            </thead>
            <tbody>
              ${editableData.items
                .map(
                  (item, index) => `
                <tr class="border-b border-black">
                  <td class="border-r border-black p-1.5">
                    <div>${item.productName}</div>
                    <div class="text-[10px] text-gray-600">
                      ${item.variantColor}${
                    item.variantStorage ? ` - ${item.variantStorage}` : ""
                  }
                    </div>
                  </td>
                  <td class="border-r border-black p-1.5 text-center">
                    ${item.imei || "N/A"}
                  </td>
                  <td class="p-1.5 text-right font-semibold">
                    ${formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <!-- Warranty Terms - COMPACT -->
          <div class="border border-black p-2 mb-3 text-xs">
            <p class="font-bold mb-1">GÓI BẢO HÀNH CƠ BẢN Ninh Kiều iSTORE Care</p>
            <p class="font-bold mb-1">
              LƯU Ý NHỮNG TRƯỜNG HỢP KHÔNG ĐƯỢC BẢO HÀNH
            </p>
            <ul class="list-disc ml-4 text-[10px] space-y-0.5 leading-tight">
              <li>Mất tem máy, rách tem</li>
              <li>
                Kiểm tra màn hình (trường hợp màn sọc mực, đen màn, lỗi màn hình khi
                ra khỏi shop sẽ không bảo hành)
              </li>
              <li>
                Máy bị phơi đơm theo giấy bảo hành KHÔNG có hữu trách nhiệm tài
                khoản icloud
              </li>
              <li>Máy rơi/va đụp, máy trả góp shop không bỏ trợ bảo an tiền</li>
            </ul>
          </div>

          <!-- Totals - COMPACT -->
          <div class="border border-black text-xs mb-3">
            <div class="flex justify-between p-1.5 border-b border-black">
              <span class="font-bold">Tiền sản phẩm:</span>
              <span class="font-bold">${formatPrice(
                editableData.totalAmount
              )}</span>
            </div>
            <div class="flex justify-between p-1.5 border-b border-black">
              <span>Voucher:</span>
              <span>0</span>
            </div>
            <div class="flex justify-between p-1.5 border-b border-black bg-yellow-50">
              <span class="font-bold">Thành tiền:</span>
              <span class="font-bold">${formatPrice(
                editableData.totalAmount
              )}</span>
            </div>
            <div class="flex justify-between p-1.5 border-b border-black">
              <span class="font-bold">Tiền đã đưa:</span>
              <span class="font-bold">${formatPrice(
                editableData.paymentReceived
              )}</span>
            </div>
            <div class="flex justify-between p-1.5">
              <span>Khoản vay còn lại:</span>
              <span>0</span>
            </div>
          </div>

          <!-- Warning -->
          <div class="text-center my-2">
            <p class="font-bold italic text-xs">
              CẢM ƠN QUÝ KHÁCH ĐÃ TIN TƯỞNG ỦNG HỘ Ninh Kiều iSTORE !!!
            </p>
          </div>

          <!-- Signatures -->
          <div class="flex justify-between mb-3">
            <div class="text-center text-xs">
              <p class="font-bold mb-12">NHÂN VIÊN</p>
              <p>${editableData.staffName}</p>
            </div>
            <div class="text-center text-xs">
              <p class="font-bold mb-12">KHÁCH HÀNG</p>
              <p>${editableData.customerName}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center text-[10px] border-t border-black pt-2">
            <p class="font-bold">
              BẢO HÀNH PHÂN CŨNG PHẦN MỀM TRỌNG 6 THÁNG (KHÔNG ĐỔI LỖI)
            </p>
            <p>
              Xem thêm các điều khoản bảo hành tại 
              <span class="font-semibold">https://ninhkieu-istore-ct.onrender.com</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ✅ BƯỚC 2: Mở window in
    const printWindow = window.open("", "", "width=800,height=1000");
    if (!printWindow) {
      toast.error("Không thể mở cửa sổ in. Vui lòng kiểm tra popup blocker.");
      return;
    }

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();

    // ✅ BƯỚC 3: Xử lý sau khi in xong
    // const handleAfterPrint = async () => {
    //   try {
    //     // Đóng window in
    //     if (printWindow && !printWindow.closed) {
    //       printWindow.close();
    //     }

    //     // ✅ HOÀN TẤT ĐƠN HÀNG
    //     setIsLoading(true);

    //     const authStorage = localStorage.getItem("auth-storage");
    //     const token = authStorage ? JSON.parse(authStorage).state.token : null;

    //     if (!token) {
    //       throw new Error("Token không hợp lệ");
    //     }

    //     console.log("Gọi API hoàn tất đơn:", orderToPrint._id);

    //     await axios.put(
    //       `${import.meta.env.VITE_API_URL}/orders/${orderToPrint._id}/status`,
    //       {
    //         status: "DELIVERED",
    //         note: "Thu ngân hoàn tất đơn hàng - In hóa đơn thành công",
    //       },
    //       {
    //         headers: {
    //           Authorization: `Bearer ${token}`,
    //           "Content-Type": "application/json",
    //         },
    //       }
    //     );

    //     console.log("✅ Hoàn tất đơn thành công");

    //     toast.success("Đơn hàng đã hoàn tất!");

    //     // ĐÓNG DIALOG & REFRESH
    //     setShowEditInvoice(false);
    //     setOrderToPrint(null);
    //     await fetchPendingOrders();
    //   } catch (error) {
    //     console.error("❌ Lỗi hoàn tất đơn:", error);
    //     // ✅ CHỈ TOAST LỖI, KHÔNG BLOCK USER
    //     toast.error("Lỗi hoàn tất đơn. Vui lòng thử lại sau.");
    //     // Vẫn đóng dialog để user tiếp tục công việc khác
    //     setShowEditInvoice(false);
    //     setOrderToPrint(null);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };

    // ✅ BƯỚC 4: Gán event listener cho afterprint
    // printWindow.addEventListener("afterprint", handleAfterPrint);

    // ✅ BƯỚC 5: Trigger print dialog
    setTimeout(() => {
      printWindow.print();
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
        onOpenChange={setShowEditInvoice} // ← Đơn giản hóa thành này
        order={orderToPrint}
        onPrint={handlePrintInvoice}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CASHIERDashboard;
