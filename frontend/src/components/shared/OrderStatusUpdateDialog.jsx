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
import { toast } from "sonner";
import { orderAPI, userAPI } from "@/lib/api";

const OrderStatusUpdateDialog = ({ order, open, onClose, onSuccess }) => {
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [shippers, setShippers] = useState([]);
  const [selectedShipper, setSelectedShipper] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch danh sách Shipper khi cần chuyển sang SHIPPING
  useEffect(() => {
    if (open && order && newStatus === "SHIPPING") {
      fetchShippers();
    }
  }, [open, order, newStatus]);

  const fetchShippers = async () => {
    try {
      const response = await userAPI.getAllShippers();
      setShippers(response.data.data.shippers || []);
    } catch (error) {
      console.error("Lỗi tải danh sách Shipper:", error);
      toast.error("Không thể tải danh sách Shipper");
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
          <DialogDescription>
            Đơn hàng #{order.orderNumber} - Trạng thái hiện tại:{" "}
            <strong>{order.status}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                <p className="text-sm text-yellow-600">
                  ⚠️ Không có Shipper nào khả dụng
                </p>
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
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ Không thể thay đổi trạng thái từ{" "}
              <strong>{order.status}</strong>
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
