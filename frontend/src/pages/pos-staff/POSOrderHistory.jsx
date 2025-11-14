// ============================================
// FILE: frontend/src/pages/pos-staff/POSOrderHistory.jsx
// Lịch sử đơn hàng POS của nhân viên bán hàng
// ============================================

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  Search,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  FileText,
  Download,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import axios from "axios";

const POSOrderHistory = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });

  // ============================================
  // FETCH ORDERS
  // ============================================
  useEffect(() => {
    fetchOrders();
  }, [dateFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/pos/orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: dateFilter.startDate,
            endDate: dateFilter.endDate,
          },
        }
      );

      const ordersData = response.data.data.orders || [];
      setOrders(ordersData);

      // Calculate statistics
      const total = ordersData.length;
      const revenue = ordersData.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      setStats({
        totalOrders: total,
        totalRevenue: revenue,
        avgOrderValue: total > 0 ? revenue / total : 0,
      });
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
      toast.error("Không thể tải lịch sử đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // VIEW ORDER DETAIL
  // ============================================
  const handleViewDetail = async (orderId) => {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSelectedOrder(response.data.data.order);
      setShowDetailDialog(true);
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
      toast.error("Không thể tải thông tin đơn hàng");
    }
  };

  // ============================================
  // REPRINT RECEIPT
  // ============================================
  const handleReprintReceipt = (order) => {
    const printWindow = window.open("", "", "width=300,height=600");
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn #${order.posInfo.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; width: 80mm; margin: 0; padding: 10px; }
          h1 { text-align: center; font-size: 18px; margin: 10px 0; }
          .info { text-align: center; margin-bottom: 10px; font-size: 12px; }
          hr { border: 1px dashed #000; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td { padding: 5px 0; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .total { font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          .badge { background: #4CAF50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>APPLE STORE CẦN THƠ</h1>
        <div class="info">
          <p>Địa chỉ: Xuân Khánh, Ninh Kiều, Cần Thơ</p>
          <p>Hotline: 1900.xxxx</p>
        </div>
        <hr/>
        <p><strong>Số phiếu:</strong> ${order.posInfo.receiptNumber}</p>
        <p><strong>Ngày:</strong> ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
        <p><strong>Thu ngân:</strong> ${order.posInfo.cashierName}</p>
        ${
          order.shippingAddress?.fullName !== "Mua tại cửa hàng"
            ? `<p><strong>Khách:</strong> ${order.shippingAddress.fullName}</p>`
            : ""
        }
        ${
          order.vatInvoice?.invoiceNumber
            ? `<p><span class="badge">Đã xuất VAT</span></p>`
            : ""
        }
        <hr/>
        <table>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr>
                <td colspan="2">${item.productName}</td>
              </tr>
              <tr>
                <td>${item.variantColor}${item.variantStorage ? " • " + item.variantStorage : ""}</td>
              </tr>
              <tr>
                <td>${item.quantity} x ${formatPrice(item.price)}</td>
                <td class="right bold">${formatPrice(item.total)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <hr/>
        <table class="total">
          <tr>
            <td>Tổng tiền:</td>
            <td class="right bold">${formatPrice(order.totalAmount)}</td>
          </tr>
          <tr>
            <td>Tiền khách đưa:</td>
            <td class="right">${formatPrice(order.posInfo.paymentReceived)}</td>
          </tr>
          <tr>
            <td>Tiền thối lại:</td>
            <td class="right bold">${formatPrice(order.posInfo.changeGiven)}</td>
          </tr>
        </table>
        <hr/>
        <div class="footer">
          <p><strong>CHÍNH SÁCH BẢO HÀNH</strong></p>
          <p>Bảo hành 12 tháng chính hãng Apple</p>
          <p>Đổi trả trong 30 ngày nếu lỗi NSX</p>
          <p><em>Bản in lại - ${formatDate(new Date())}</em></p>
          <p>Cảm ơn quý khách! Hẹn gặp lại!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // ============================================
  // FILTER ORDERS
  // ============================================
  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.posInfo?.receiptNumber
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      order.shippingAddress?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Lịch sử bán hàng</h1>
        <p className="text-muted-foreground">
          Xem lại các đơn hàng đã xử lý
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <h3 className="text-2xl font-bold">
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
                <h3 className="text-2xl font-bold">
                  {formatPrice(stats.avgOrderValue)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, số phiếu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, endDate: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Danh sách đơn hàng ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Không có đơn hàng nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <p className="font-bold">#{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Phiếu: {order.posInfo.receiptNumber}
                        </p>
                      </div>
                      {order.vatInvoice?.invoiceNumber && (
                        <Badge className="bg-green-100 text-green-800">
                          <FileText className="w-3 h-3 mr-1" />
                          Đã xuất VAT
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
                    <Button
                      size="sm"
                      onClick={() => handleReprintReceipt(order)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      In lại
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Thông tin đơn hàng</h3>
                  <p className="text-sm">
                    <strong>Mã đơn:</strong> #{selectedOrder.orderNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Số phiếu:</strong>{" "}
                    {selectedOrder.posInfo.receiptNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Thời gian:</strong>{" "}
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                  <p className="text-sm">
                    <strong>Thu ngân:</strong>{" "}
                    {selectedOrder.posInfo.cashierName}
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
                      Đã xuất VAT: {selectedOrder.vatInvoice.invoiceNumber}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="font-semibold mb-3">Sản phẩm</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-3 border rounded-lg"
                    >
                      <img
                        src={item.images?.[0] || "/placeholder.png"}
                        alt={item.productName}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.variantColor}
                          {item.variantStorage && ` • ${item.variantStorage}`}
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

              {/* Payment Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tổng tiền:</span>
                  <span className="font-bold">
                    {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tiền khách đưa:</span>
                  <span>
                    {formatPrice(selectedOrder.posInfo.paymentReceived)}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Tiền thối lại:</span>
                  <span className="font-bold">
                    {formatPrice(selectedOrder.posInfo.changeGiven)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleReprintReceipt(selectedOrder)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  In lại phiếu thu
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSOrderHistory;