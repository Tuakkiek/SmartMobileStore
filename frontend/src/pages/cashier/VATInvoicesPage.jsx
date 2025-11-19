// ============================================
// FILE: frontend/src/pages/pos-staff/VATInvoicesPage.jsx
// ✅ V3: Đã xóa bộ lọc, chỉ giữ lại thanh tìm kiếm mã
// ============================================

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// Import Label bị xóa vì không còn dùng trong form
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
  // Calendar, // Xóa
  DollarSign,
  TrendingUp,
  ShoppingBag,
  FileText,
  Download,
  // Filter, // Xóa
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
  // PRINT RECEIPT (Giữ nguyên)
  // ============================================
  const handleReprintReceipt = (order) => {
    const paymentReceived =
      order.posInfo?.paymentReceived ||
      order.paymentInfo?.paymentReceived ||
      order.totalAmount;

    const changeGiven =
      order.posInfo?.changeGiven || order.paymentInfo?.changeGiven || 0;

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
        <div class="header">
          <h1>HÓA ĐƠN BÁN HÀNG</h1>
          <p>Ninh Kiều iStore</p>
          <p>Địa chỉ: Ninh Kiều, Cần Thơ | Hotline: 1900.9999</p>
        </div>

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
      printWindow.close();
    }, 250);
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

      {/* Advanced Filters (ĐÃ BỊ XÓA) */}
      {/* {showFilters && ( ... )} */}

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
