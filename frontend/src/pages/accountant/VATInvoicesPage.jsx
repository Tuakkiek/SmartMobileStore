// ============================================
// FILE: frontend/src/pages/accountant/VATInvoicesPage.jsx
// Trang quản lý danh sách hóa đơn VAT đã xuất
// ============================================

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Eye,
  Download,
  Filter,
  Calendar,
  Building2,
  Receipt,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import axios from "axios";

const VATInvoicesPage = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    sortBy: "newest",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  // ============================================
  // FETCH INVOICES
  // ============================================
  useEffect(() => {
    fetchInvoices();
  }, [filters, pagination.currentPage]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const params = {
        page: pagination.currentPage,
        limit: 20,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/pos/orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      // Lọc chỉ các đơn có VAT invoice
      const ordersWithVAT = (response.data.data.orders || []).filter(
        (order) => order.vatInvoice?.invoiceNumber
      );

      // Filter by search
      let filtered = ordersWithVAT;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (order) =>
            order.vatInvoice.invoiceNumber
              .toLowerCase()
              .includes(searchLower) ||
            order.vatInvoice.companyName?.toLowerCase().includes(searchLower) ||
            order.vatInvoice.taxCode?.toLowerCase().includes(searchLower)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        const dateA = new Date(a.vatInvoice.issuedAt);
        const dateB = new Date(b.vatInvoice.issuedAt);
        return filters.sortBy === "newest" ? dateB - dateA : dateA - dateB;
      });

      setInvoices(filtered);
      setPagination((prev) => ({ ...prev, total: filtered.length }));
    } catch (error) {
      console.error("Lỗi tải hóa đơn:", error);
      toast.error("Không thể tải danh sách hóa đơn VAT");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // VIEW INVOICE DETAIL
  // ============================================
  const handleViewDetail = (order) => {
    setSelectedInvoice(order);
    setShowDetailDialog(true);
  };

  // ============================================
  // EXPORT INVOICE TO PDF/PRINT
  // ============================================
  const handlePrintInvoice = (order) => {
    const printWindow = window.open("", "", "width=800,height=600");
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn VAT - ${order.vatInvoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; text-transform: uppercase; }
          .header p { font-size: 12px; color: #666; }
          .invoice-info { display: flex; justify-content: space-between; margin: 30px 0; }
          .invoice-info div { flex: 1; }
          .invoice-info h3 { font-size: 14px; margin-bottom: 10px; color: #333; }
          .invoice-info p { font-size: 12px; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { background: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
          td { padding: 10px; border: 1px solid #ddd; font-size: 12px; }
          .text-right { text-align: right; }
          .total-section { margin-top: 20px; }
          .total-row { display: flex; justify-content: flex-end; margin: 8px 0; font-size: 13px; }
          .total-row span:first-child { width: 200px; text-align: right; padding-right: 20px; }
          .total-row span:last-child { width: 150px; text-align: right; font-weight: bold; }
          .grand-total { border-top: 2px solid #000; padding-top: 10px; font-size: 16px; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #666; }
          .signature-section { display: flex; justify-content: space-around; margin-top: 60px; text-align: center; }
          .signature-box { width: 200px; }
          .signature-box p { margin-bottom: 80px; font-style: italic; font-size: 12px; }
          .signature-line { border-top: 1px solid #000; padding-top: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <h1>Hóa Đơn Giá Trị Gia Tăng</h1>
          <p>Apple Store Cần Thơ</p>
          <p>Địa chỉ: Xuân Khánh, Ninh Kiều, Cần Thơ | Hotline: 1900.xxxx</p>
          <p>Mã số thuế: 0123456789</p>
        </div>

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div>
            <h3>Thông tin hóa đơn</h3>
            <p><strong>Số hóa đơn:</strong> ${
              order.vatInvoice.invoiceNumber
            }</p>
            <p><strong>Ngày xuất:</strong> ${formatDate(
              order.vatInvoice.issuedAt
            )}</p>
            <p><strong>Người xuất:</strong> ${
              order.vatInvoice.issuedBy ? "Kế toán" : "N/A"
            }</p>
          </div>
          <div>
            <h3>Thông tin khách hàng</h3>
            <p><strong>Công ty:</strong> ${order.vatInvoice.companyName}</p>
            <p><strong>Mã số thuế:</strong> ${order.vatInvoice.taxCode}</p>
            <p><strong>Địa chỉ:</strong> ${
              order.vatInvoice.companyAddress || "N/A"
            }</p>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th>Tên hàng hóa, dịch vụ</th>
              <th style="width: 80px;" class="text-right">Số lượng</th>
              <th style="width: 120px;" class="text-right">Đơn giá</th>
              <th style="width: 120px;" class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item, idx) => `
              <tr>
                <td class="text-right">${idx + 1}</td>
                <td>
                  ${item.productName}
                  ${
                    item.variantColor
                      ? `<br><small style="color: #666;">${item.variantColor}${
                          item.variantStorage ? " • " + item.variantStorage : ""
                        }</small>`
                      : ""
                  }
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
            <span>Tổng tiền chưa VAT:</span>
            <span>${formatPrice(order.totalAmount)}</span>
          </div>
          <div class="total-row">
            <span>VAT (10%):</span>
            <span>${formatPrice(order.totalAmount * 0.1)}</span>
          </div>
          <div class="total-row grand-total">
            <span>Tổng tiền thanh toán:</span>
            <span>${formatPrice(order.totalAmount * 1.1)}</span>
          </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <p>Người mua hàng</p>
            <div class="signature-line">(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-box">
            <p>Người bán hàng</p>
            <div class="signature-line">(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-box">
            <p>Thủ trưởng đơn vị</p>
            <div class="signature-line">(Ký, đóng dấu)</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Hóa đơn này được in từ hệ thống quản lý Apple Store Cần Thơ</p>
          <p>Ngày in: ${formatDate(new Date())}</p>
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
  // STATISTICS
  // ============================================
  const getStatistics = () => {
    const today = new Date();
    const thisMonth = invoices.filter((order) => {
      const issueDate = new Date(order.vatInvoice.issuedAt);
      return (
        issueDate.getMonth() === today.getMonth() &&
        issueDate.getFullYear() === today.getFullYear()
      );
    });

    return {
      total: invoices.length,
      thisMonth: thisMonth.length,
      totalRevenue: invoices.reduce((sum, o) => sum + o.totalAmount, 0),
      thisMonthRevenue: thisMonth.reduce((sum, o) => sum + o.totalAmount, 0),
    };
  };

  const stats = getStatistics();

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Quản lý hóa đơn VAT</h1>
        <p className="text-muted-foreground">Danh sách hóa đơn VAT đã xuất</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Tổng số hóa đơn
                </p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tháng này</p>
                <h3 className="text-2xl font-bold">{stats.thisMonth}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-green-600" />
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
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  DT tháng này
                </p>
                <h3 className="text-xl font-bold">
                  {formatPrice(stats.thisMonthRevenue)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm số HĐ, công ty, MST..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-9"
              />
            </div>

            <div>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                placeholder="Từ ngày"
              />
            </div>

            <div>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                placeholder="Đến ngày"
              />
            </div>

            <Select
              value={filters.sortBy}
              onValueChange={(value) =>
                setFilters({ ...filters, sortBy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mới nhất</SelectItem>
                <SelectItem value="oldest">Cũ nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách hóa đơn</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Đang tải...</p>
          ) : invoices.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Không có hóa đơn VAT nào
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-bold">
                          {order.vatInvoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Đơn hàng: #{order.orderNumber}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Công ty:</p>
                        <p className="font-medium">
                          {order.vatInvoice.companyName}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">MST:</p>
                        <p className="font-medium">
                          {order.vatInvoice.taxCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ngày xuất:</p>
                        <p className="font-medium">
                          {formatDate(order.vatInvoice.issuedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Giá trị:</p>
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
                      onClick={() => handleViewDetail(order)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Chi tiết
                    </Button>
                    <Button size="sm" onClick={() => handlePrintInvoice(order)}>
                      <Download className="w-4 h-4 mr-2" />
                      In HĐ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn VAT</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.vatInvoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Thông tin hóa đơn</h3>
                  <p className="text-sm">
                    <strong>Số HĐ:</strong>{" "}
                    {selectedInvoice.vatInvoice.invoiceNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Ngày xuất:</strong>{" "}
                    {formatDate(selectedInvoice.vatInvoice.issuedAt)}
                  </p>
                  <p className="text-sm">
                    <strong>Đơn hàng:</strong> #{selectedInvoice.orderNumber}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
                  <p className="text-sm">
                    <strong>Công ty:</strong>{" "}
                    {selectedInvoice.vatInvoice.companyName}
                  </p>
                  <p className="text-sm">
                    <strong>MST:</strong> {selectedInvoice.vatInvoice.taxCode}
                  </p>
                  <p className="text-sm">
                    <strong>Địa chỉ:</strong>{" "}
                    {selectedInvoice.vatInvoice.companyAddress || "N/A"}
                  </p>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="font-semibold mb-3">Sản phẩm</h3>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between p-3 border rounded"
                    >
                      <div>
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

              {/* Total */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tổng tiền chưa VAT:</span>
                  <span>{formatPrice(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (10%):</span>
                  <span>{formatPrice(selectedInvoice.totalAmount * 0.1)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Tổng thanh toán:</span>
                  <span className="text-primary">
                    {formatPrice(selectedInvoice.totalAmount * 1.1)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  In hóa đơn
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VATInvoicesPage;
