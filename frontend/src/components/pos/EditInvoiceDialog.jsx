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
import { Textarea } from "@/components/ui/textarea";
import InvoiceTemplate from "./InvoiceTemplate";

const EditInvoiceDialog = ({
  open,
  onOpenChange,
  order,
  onPrint,
  onConfirmPayment,
  isLoading,
}) => {
  const [editableData, setEditableData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    items: [],
    totalAmount: 0,
    paymentReceived: 0,
    changeGiven: 0,
    orderNumber: "",
    createdAt: new Date(),
    staffName: "",
    cashierName: "",
  });

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (order) {
      setEditableData({
        customerName: order.shippingAddress?.fullName || "",
        customerPhone: order.shippingAddress?.phoneNumber || "",
        customerAddress: `${order.shippingAddress?.detailAddress || ""}, ${
          order.shippingAddress?.ward || ""
        }, ${order.shippingAddress?.province || ""}`.trim(),
        items: order.items.map((item) => ({
          ...item,
          imei: item.imei || "", // IMEI field
        })),
        totalAmount: order.totalAmount,
        paymentReceived: order.posInfo?.paymentReceived || order.totalAmount,
        changeGiven: order.posInfo?.changeGiven || 0,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        staffName: order.posInfo?.staffName || "N/A",
        cashierName: order.posInfo?.cashierName || "Thu ngân",
      });
    }
  }, [order]);

  const handleChange = (field, value) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setEditableData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };



  const handleConfirm = async () => {
    if (onConfirmPayment) {
      const success = await onConfirmPayment(editableData);
      if (success) {
        setShowPreview(true);
      }
    } else {
      // Fallback or old behavior if needed, but for now we expect onConfirmPayment
      setShowPreview(true);
    }
  };

  const handlePrint = () => {
    onPrint(editableData);
  };

  if (showPreview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước hóa đơn</DialogTitle>
          </DialogHeader>

          <InvoiceTemplate
            order={order}
            editableData={editableData}
            storeInfo={{}}
          />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Quay lại chỉnh sửa
            </Button>
            <Button onClick={handlePrint}>
              In hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hóa đơn</DialogTitle>
          <DialogDescription>
            Mã đơn: #{editableData.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tên khách hàng</Label>
              <Input
                value={editableData.customerName}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                value={editableData.customerPhone}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label>Địa chỉ</Label>
            <Textarea
              value={editableData.customerAddress}
              onChange={(e) => handleChange("customerAddress", e.target.value)}
              rows={2}
            />
          </div>

          {/* Products */}
          <div>
            <Label className="text-lg font-bold">Danh sách sản phẩm</Label>
            <div className="space-y-4 mt-2">
              {editableData.items.map((item, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-2 bg-muted/30"
                >
                  <p className="font-medium">{item.productName}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">IMEI</Label>
                      <Input
                        value={item.imei}
                        onChange={(e) =>
                          handleItemChange(index, "imei", e.target.value)
                        }
                        placeholder="Nhập IMEI"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Số lượng</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Đơn giá</Label>
                      <Input
                        type="number"
                        value={item.price}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tiền khách đưa</Label>
              <Input
                type="number"
                value={editableData.paymentReceived}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Tiền thối lại</Label>
              <Input
                type="number"
                value={Math.max(
                  0,
                  editableData.paymentReceived - editableData.totalAmount
                )}
                disabled
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)} // ← Đơn giản, không hỏi confirm
          >
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác nhận thanh toán và xem hóa đơn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceDialog;
