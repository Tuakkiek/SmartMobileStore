// ============================================
// FILE: frontend/src/components/order/OrderStatusUpdateDialog.jsx
// Component để Order Manager cập nhật trạng thái và chọn Shipper
// ============================================

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { orderAPI, userAPI } from "@/lib/api";
import { getStatusColor, getStatusText } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

const OrderStatusUpdateDialog = ({ order, open, onClose, onSuccess }) => {
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [shippers, setShippers] = useState([]);
  const [selectedShipper, setSelectedShipper] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingShippers, setIsFetchingShippers] = useState(false);

  // Fetch danh sách Shipper khi cần chuyển sang SHIPPING
  useEffect(() => {
    if (open && order && newStatus === "SHIPPING") {
      fetchShippers();
    }
  }, [open, order, newStatus]);

  // Reset form khi mở dialog
  useEffect(() => {
    if (open) {
      setNewStatus("");
      setNote("");
      setSelectedShipper("");
      setShippers([]);
    }
  }, [open]);

  const fetchShippers = async () => {
    setIsFetchingShippers(true);
    try {
      const response = await userAPI.getAllShippers();
      setShippers(response.data.data.shippers || []);
    } catch (error) {
      console.error("Lỗi tải danh sách Shipper:", error);
      toast.error("Không thể tải danh sách Shipper");
      setShippers([]);
    } finally {
      setIsFetchingShippers(false);
    }
  };

  const getValidTransitions = (currentStatus) => {
    const transitions = {
      PENDING: [
        { value: "CONFIRMED", label: "Chờ lấy hàng" },
        { value: "CANCELLED", label: "Hủy đơn" },
      ],
      PENDING_PAYMENT: [
        { value: "PAYMENT_VERIFIED", label: "Đã thanh toán" },
        { value: "CANCELLED", label: "Hủy đơn" },
      ],
      PAYMENT_VERIFIED: [
        { value: "CONFIRMED", label: "Chờ lấy hàng" },
        { value: "CANCELLED", label: "Hủy đơn" },
      ],
      CONFIRMED: [
        { value: "SHIPPING", label: "Đang giao hàng" },
        { value: "CANCELLED", label: "Hủy đơn" },
      ],
      SHIPPING: [
        { value: "DELIVERED", label: "Đã giao hàng" },
        { value: "RETURNED", label: "Trả hàng" },
      ],
      DELIVERED: [{ value: "RETURNED", label: "Trả hàng" }],
      RETURNED: [],
      CANCELLED: [],
    };
    return transitions[currentStatus] || [];
  };

  const handleSubmit = async () => {
    if (!newStatus) {
      toast.error("Vui lòng chọn trạng thái mới");
      return;
    }

    // ✅ Kiểm tra nếu chuyển sang SHIPPING phải chọn Shipper
    if (newStatus === "SHIPPING" && !selectedShipper) {
      toast.error("Vui lòng chọn Shipper để giao hàng");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        status: newStatus,
        note: note.trim() || undefined,
      };

      // ✅ Thêm shipperId nếu chuyển sang SHIPPING
      if (newStatus === "SHIPPING" && selectedShipper) {
        payload.shipperId = selectedShipper;
      }

      await orderAPI.updateStatus(order._id, payload);
      toast.success("Cập nhật trạng thái thành công");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) return null;

  const validTransitions = getValidTransitions(order.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
          <DialogDescription>Đơn hàng #{order.orderNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trạng thái hiện tại */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Trạng thái hiện tại
            </p>
            <Badge className={getStatusColor(order.status)}>
              {getStatusText(order.status)}
            </Badge>
          </div>

          {/* Chọn trạng thái mới */}
          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái mới *</Label>
            <select
              id="status"
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value);
                setSelectedShipper(""); // Reset shipper khi đổi trạng thái
              }}
              className="w-full px-3 py-2 border rounded-md"
              disabled={validTransitions.length === 0}
            >
              <option value="">-- Chọn trạng thái --</option>
              {validTransitions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ Dropdown chọn Shipper (chỉ hiện khi chuyển sang SHIPPING) */}
          {newStatus === "SHIPPING" && (
            <div className="space-y-2">
              <Label htmlFor="shipper">Chọn Shipper *</Label>
              {isFetchingShippers ? (
                <div className="flex items-center justify-center p-3 border rounded-md">
                  <AlertCircle className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Đang tải danh sách Shipper...
                  </span>
                </div>
              ) : (
                <>
                  <select
                    id="shipper"
                    value={selectedShipper}
                    onChange={(e) => setSelectedShipper(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">-- Chọn Shipper --</option>
                    {shippers.map((shipper) => (
                      <option key={shipper._id} value={shipper._id}>
                        {shipper.fullName} - {shipper.phoneNumber}
                      </option>
                    ))}
                  </select>
                  {shippers.length === 0 && (
                    <p className="text-sm text-yellow-600 flex items-center gap-2 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      Không có Shipper nào khả dụng
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Ghi chú */}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
            <Input
              id="note"
              placeholder="Nhập ghi chú nếu cần..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Cảnh báo không thể chuyển trạng thái */}
          {validTransitions.length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Không thể thay đổi trạng thái từ{" "}
                <strong>{getStatusText(order.status)}</strong>
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !newStatus || validTransitions.length === 0}
          >
            {isLoading ? "Đang xử lý..." : "Cập nhật"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderStatusUpdateDialog;
