// ============================================
// FILE: frontend/src/pages/accountant/AccountantDashboard.jsx
// Trang quản lý hóa đơn VAT và báo cáo doanh thu
// ============================================

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Search,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice, formatDate } from "@/lib/utils";
import axios from "axios";

const AccountantDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showVATDialog, setShowVATDialog] = useState(false);
  const [vatForm, setVatForm] = useState({
    companyName: "",
    taxCode: "",
    companyAddress: "",
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchOrders();
    fetchRevenue();
  }, [dateRange]);

  // ============================================
  // FETCH DATA
  // ============================================
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
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        }
      );

      setOrders(response.data.data.orders || []);
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/pos/revenue`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        }
      );

      setRevenue(response.data.data);
    } catch (error) {
      console.error("Lỗi tải doanh thu:", error);
    }
  };

  // ============================================
  // ISSUE VAT INVOICE
  // ============================================
  const handleIssueVAT = async () => {
    if (!vatForm.companyName || !vatForm.taxCode) {
      toast.error("Vui lòng nhập đầy đủ thông tin công ty");
      return;
    }

    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      await axios.post(
        `${import.meta.env.VITE_API_URL}/pos/orders/${selectedOrder._id}/vat-invoice`,
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
      setVatForm({ companyName: "", taxCode: "", companyAddress: "" });
      fetchOrders();
    } catch (error) {
      console.error("Lỗi xuất VAT:", error);
      toast.error(error.response?.data?.message || "Xuất hóa đơn VAT thất bại");
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Kế toán</h1>
        <p className="text-muted-foreground">
          Quản lý hóa đơn VAT và báo cáo doanh thu
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
            <Button onClick={fetchOrders}>
              <Search className="w-4 h-4 mr-2" />
              Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Statistics */}
      {revenue && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Tổng doanh thu
                  </p>
                  <h3 className="text-2xl font-bold">
                    {formatPrice(revenue.summary.totalRevenue)}
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
                    Tổng đơn hàng
                  </p>
                  <h3 className="text-2xl font-bold">
                    {revenue.summary.totalOrders}
                  </h3>
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
                  <p className="text-sm text-muted-foreground mb-1">
                    Giá trị TB/đơn
                  </p>
                  <h3 className="text-2xl font-bold">
                    {formatPrice(revenue.summary.avgOrderValue)}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Staff Revenue */}
      {revenue?.staffRevenue && revenue.staffRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Doanh thu theo nhân viên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenue.staffRevenue.map((staff) => (
                <div
                  key={staff._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{staff.cashierName}</p>
                    <p className="text-sm text-muted-foreground">
                      {staff.totalOrders} đơn hàng
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(staff.totalRevenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng POS</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Đang tải...</p>
          ) : orders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Không có đơn hàng
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-bold">#{order.orderNumber}</p>
                      {order.vatInvoice?.invoiceNumber ? (
                        <Badge className="bg-green-100 text-green-800">
                          Đã xuất VAT
                        </Badge>
                      ) : (
                        <Badge variant="outline">Chưa xuất VAT</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)} •{" "}
                      {order.posInfo?.cashierName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length} sản phẩm
                    </p>
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(order.totalAmount)}
                    </p>
                    {!order.vatInvoice?.invoiceNumber && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowVATDialog(true);
                        }}
                      >
                        Xuất VAT
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VAT Invoice Dialog */}
      <Dialog open={showVATDialog} onOpenChange={setShowVATDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất hóa đơn VAT</DialogTitle>
            <DialogDescription>
              Đơn hàng: #{selectedOrder?.orderNumber} -{" "}
              {formatPrice(selectedOrder?.totalAmount)}
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
              <Label htmlFor="companyAddress">Địa chỉ công ty</Label>
              <Input
                id="companyAddress"
                placeholder="123 Đường ABC, Quận XYZ..."
                value={vatForm.companyAddress}
                onChange={(e) =>
                  setVatForm({ ...vatForm, companyAddress: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVATDialog(false);
                setVatForm({
                  companyName: "",
                  taxCode: "",
                  companyAddress: "",
                });
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleIssueVAT}>Xuất hóa đơn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountantDashboard;