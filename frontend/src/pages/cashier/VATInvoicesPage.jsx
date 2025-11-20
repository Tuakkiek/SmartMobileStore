// ============================================
// FILE: frontend/src/pages/pos-staff/VATInvoicesPage.jsx
// ✅ V3: Đã xóa bộ lọc, chỉ giữ lại thanh tìm kiếm mã
// ============================================

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Receipt,
  Search,
  Eye,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  FileText,
  Download,
  X,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";

const VATInvoicesPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  // ============================================
  // STATE (ĐÃ ĐƠN GIẢN HÓA)
  // ============================================
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Chỉ giữ lại state cho tìm kiếm
  const [searchInput, setSearchInput] = useState(""); // State cho ô input
  const [filters, setFilters] = useState({
    search: "", // State kích hoạt tìm kiếm
  });

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    totalVATInvoices: 0,
  });

  // ============================================
  // FETCH ORDERS (ĐÃ ĐƠN GIẢN HÓA)
  // ============================================
  useEffect(() => {
    fetchOrders();
  }, [filters]); // Chỉ trigger khi 'filters' thay đổi

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      // Xóa các params không cần thiết
      const params = {};

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/pos/my-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      let ordersData = response.data.data.orders || [];

      // Client-side filtering (Chỉ giữ lại 'search')
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        ordersData = ordersData.filter(
          (order) =>
            order.orderNumber?.toLowerCase().includes(searchLower) ||
            order.posInfo?.receiptNumber?.toLowerCase().includes(searchLower) ||
            order.shippingAddress?.fullName
              ?.toLowerCase()
              .includes(searchLower) ||
            order.shippingAddress?.phoneNumber?.includes(searchLower)
        );
      }

      setOrders(ordersData);

      // Calculate statistics (Giữ nguyên)
      const total = ordersData.length;
      const revenue = ordersData.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      const vatCount = ordersData.filter(
        (o) => o.vatInvoice?.invoiceNumber
      ).length;

      setStats({
        totalOrders: total,
        totalRevenue: revenue,
        avgOrderValue: total > 0 ? revenue / total : 0,
        totalVATInvoices: vatCount,
      });
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
      toast.error("Không thể tải lịch sử đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HANDLERS MỚI CHO TÌM KIẾM
  // ============================================
  const handleSearch = () => {
    setFilters({ search: searchInput });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setFilters({ search: "" });
  };

  // ============================================
  // VIEW DETAIL (Giữ nguyên)
  // ============================================
  const handleViewDetail = async (orderId) => {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/pos/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Order detail from API:", response.data.data.order);
      setSelectedOrder(response.data.data.order);
      setShowDetailDialog(true);
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
      toast.error("Không thể tải thông tin đơn hàng");
    }
  };

  // ============================================
  // PRINT RECEIPT (ĐÃ SỬA THEO MẪU MỚI)
  // ============================================
  const handleReprintReceipt = (order) => {
    const editableData = {
      customerName: order.shippingAddress?.fullName || "",
      customerPhone: order.shippingAddress?.phoneNumber || "",
      customerAddress: `${order.shippingAddress?.detailAddress || ""}, ${
        order.shippingAddress?.ward || ""
      }, ${order.shippingAddress?.province || ""}`.trim(),
      items: order.items,
      totalAmount: order.totalAmount,
      paymentReceived: order.posInfo?.paymentReceived || order.totalAmount,
      changeGiven: order.posInfo?.changeGiven || 0,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt, // ← Ngày mua hàng
      staffName: order.posInfo?.staffName || "N/A",
      cashierName: order.posInfo?.cashierName || "Thu ngân",
    };

    const printWindow = window.open("", "", "width=800,height=1000");

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

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // ============================================
  // RENDER (ĐÃ THAY ĐỔI HEADER, XÓA BỘ LỌC)
  // ============================================
  return (
    <div className="space-y-6 p-6">
      {/* Header (ĐÃ THAY ĐỔI) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lịch sử bán hàng</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Xem tất cả đơn hàng trong hệ thống"
              : "Xem các đơn hàng đã xử lý"}
          </p>
        </div>
        {/* === Thanh tìm kiếm mới === */}
        <div className="flex w-full md:w-auto md:max-w-sm items-center gap-2">
          <Input
            type="text"
            placeholder="Tìm theo mã đơn, phiếu, SĐT..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="flex-1"
          />
          <Button onClick={handleSearch} aria-label="Tìm kiếm">
            <Search className="w-4 h-4" />
          </Button>
          {/* Nút xóa chỉ hiện khi đang có tìm kiếm */}
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Statistics (Giữ nguyên) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Tổng đơn hàng
                </p>
                <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Tổng doanh thu
                </p>
                <h3 className="text-xl font-bold">
                  {formatPrice(stats.totalRevenue)}
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
                  Giá trị TB/đơn
                </p>
                <h3 className="text-xl font-bold">
                  {formatPrice(stats.avgOrderValue)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Hóa đơn</p>
                <h3 className="text-2xl font-bold">{stats.totalVATInvoices}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List (Giữ nguyên) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Danh sách đơn hàng ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filters.search
                  ? "Không tìm thấy đơn hàng"
                  : "Không có đơn hàng nào"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <p className="font-bold">#{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Phiếu: {order.posInfo?.receiptNumber || "N/A"}
                        </p>
                      </div>
                      {order.vatInvoice?.invoiceNumber && (
                        <Badge className="bg-green-100 text-green-800">
                          <FileText className="w-3 h-3 mr-1" />
                          VAT
                        </Badge>
                      )}
                      <Badge
                        className={
                          order.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {order.paymentStatus === "PAID"
                          ? "Đã thanh toán"
                          : "Chưa thanh toán"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                      {isAdmin && (
                        <div>
                          <p className="text-muted-foreground">NV bán:</p>
                          <p className="font-medium">
                            {order.posInfo?.staffName || "N/A"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Khách hàng:</p>
                        <p className="font-medium">
                          {order.shippingAddress?.fullName || "Khách lẻ"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Thời gian:</p>
                        <p className="font-medium">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Số lượng:</p>
                        <p className="font-medium">{order.items.length} SP</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tổng tiền:</p>
                        <p className="font-bold text-primary">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetail(order._id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Chi tiết
                    </Button>
                    {order.paymentStatus === "PAID" && (
                      <Button
                        size="sm"
                        onClick={() => handleReprintReceipt(order)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        In lại
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog (Giữ nguyên) */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
            <DialogDescription>{selectedOrder?.orderNumber}</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Thông tin đơn hàng</h3>
                  <p className="text-sm">
                    <strong>Mã đơn:</strong> #{selectedOrder.orderNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Số phiếu:</strong>{" "}
                    {selectedOrder.posInfo?.receiptNumber || "N/A"}
                  </p>
                  <p className="text-sm">
                    <strong>Thời gian:</strong>{" "}
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                  {isAdmin && (
                    <p className="text-sm">
                      <strong>NV bán:</strong>{" "}
                      {selectedOrder.posInfo?.staffName || "N/A"}
                    </p>
                  )}
                  <p className="text-sm">
                    <strong>Thu ngân:</strong>{" "}
                    {selectedOrder.posInfo?.cashierName || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
                  <p className="text-sm">
                    <strong>Họ tên:</strong>{" "}
                    {selectedOrder.shippingAddress?.fullName || "Khách lẻ"}
                  </p>
                  <p className="text-sm">
                    <strong>SĐT:</strong>{" "}
                    {selectedOrder.shippingAddress?.phoneNumber || "N/A"}
                  </p>
                  {selectedOrder.vatInvoice?.invoiceNumber && (
                    <Badge className="bg-green-100 text-green-800 mt-2">
                      Đã : {selectedOrder.vatInvoice.invoiceNumber}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Sản phẩm</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-3 border rounded-lg">
                      <img
                        src={item.images?.[0] || "/placeholder.png"}
                        alt={item.productName}
                        className="w-20 h-20 object-cover rounded"
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
                      <p className="font-bold">{formatPrice(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tổng tiền:</span>
                  <span className="font-bold">
                    {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
                {selectedOrder.paymentStatus === "PAID" && (
                  <>
                    <div className="flex justify-between">
                      <span>Tiền khách đưa:</span>
                      <span>
                        {formatPrice(
                          selectedOrder.posInfo.paymentReceived ||
                            selectedOrder.totalAmount
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Tiền thối lại:</span>
                      <span className="font-bold">
                        {formatPrice(selectedOrder.posInfo.changeGiven || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                {selectedOrder.paymentStatus === "PAID" && (
                  <Button
                    className="flex-1"
                    onClick={() => handleReprintReceipt(selectedOrder)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    In lại phiếu thu
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VATInvoicesPage;
