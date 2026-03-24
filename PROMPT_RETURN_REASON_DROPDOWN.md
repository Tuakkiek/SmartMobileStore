# Prompt: Xử lý trả hàng với dropdown lý do cho Shipper

## Mô tả yêu cầu

Khi shipper giao hàng, nếu khách hàng không nhận hàng hoặc hàng có vấn đề, shipper cần xử lý trả hàng. Thay vì chỉ có 1 ô text input để nhập lý do trả hàng như hiện tại, cần thêm một dropdown để chọn loại lý do trả hàng trước, bao gồm:

- **Không nhận**: Khách hàng từ chối nhận hàng
- **Hàng lỗi**: Sản phẩm bị hỏng, lỗi, sai sản phẩm...
- **Khác**: Các lý do khác (sẽ hiện ô text input để nhập chi tiết)

## Files cần chỉnh sửa

### 1. `frontend/src/features/shipping/pages/ShipperDashboard.jsx`

#### Thêm state mới:

```jsx
const [selectedReturnReasonType, setSelectedReturnReasonType] = useState(""); // "KHONG_NHAN", "HANG_LOI", "KHAC"
```

#### Chỉnh sửa Return Dialog:

Thay đổi từ chỉ có Input thành có Select dropdown và Input chi tiết:

```jsx
{
  /* Return Reason Type Dropdown */
}
<div className="space-y-2">
  <Label>Lý do trả hàng *</Label>
  <select
    value={selectedReturnReasonType}
    onChange={(e) => {
      setSelectedReturnReasonType(e.target.value);
      setReturnReason(""); // Reset detail when changing type
    }}
    className="w-full px-3 py-2 border rounded-md"
  >
    <option value="">-- Chọn lý do --</option>
    <option value="KHONG_NHAN">Không nhận</option>
    <option value="HANG_LOI">Hàng lỗi</option>
    <option value="KHAC">Khác</option>
  </select>
</div>;

{
  /* Return Reason Detail - Show only when "KHAC" is selected */
}
{
  selectedReturnReasonType === "KHAC" && (
    <div className="space-y-2">
      <Label>Chi tiết lý do *</Label>
      <Input
        placeholder="Nhập chi tiết lý do trả hàng..."
        value={returnReason}
        onChange={(e) => setReturnReason(e.target.value)}
      />
    </div>
  );
}

{
  /* Show hint for pre-defined reasons */
}
{
  selectedReturnReasonType === "KHONG_NHAN" && (
    <p className="text-sm text-muted-foreground">
      Lý do: Khách hàng từ chối nhận hàng
    </p>
  );
}

{
  selectedReturnReasonType === "HANG_LOI" && (
    <p className="text-sm text-muted-foreground">
      Lý do: Sản phẩm bị hỏng/lỗi/sai specifications
    </p>
  );
}
```

#### Cập nhật validation trong `handleReturnOrder`:

```jsx
const handleReturnOrder = async () => {
  // Validate: must select reason type
  if (!selectedReturnReasonType) {
    return toast.error("Vui lòng chọn lý do trả hàng");
  }

  // If "KHAC" is selected, detail is required
  if (selectedReturnReasonType === "KHAC" && !returnReason.trim()) {
    return toast.error("Vui lòng nhập chi tiết lý do trả hàng");
  }

  // Build return note with type and detail
  const returnNote = buildReturnNote(selectedReturnReasonType, returnReason);

  setIsSubmitting(true);
  try {
    await orderAPI.updateStatus(selectedOrder._id, {
      status: "RETURNED",
      note: returnNote,
      // Optional: store return reason type separately for analytics
      returnReasonType: selectedReturnReasonType,
    });
    toast.success("Đã xác nhận trả hàng");
    setShowReturnDialog(false);
    refreshAfterAction();
  } catch (e) {
    toast.error(e.response?.data?.message || "Cập nhật thất bại");
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Thêm helper function:

```jsx
const buildReturnNote = (reasonType, detail) => {
  const reasonLabels = {
    KHONG_NHAN: "Không nhận",
    HANG_LOI: "Hàng lỗi",
    KHAC: "Khác",
  };

  const baseNote = `Trả hàng - Lý do: ${reasonLabels[reasonType] || reasonType}`;
  const detailNote = reasonType === "KHAC" && detail ? ` (${detail})` : "";

  return baseNote + detailNote;
};
```

#### Reset state khi đóng/mở dialog:

```jsx
const openReturnDialog = (order) => {
  setSelectedOrder(order);
  setSelectedReturnReasonType("");
  setReturnReason("");
  setShowReturnDialog(true);
};
```

### 2. Backend - Tùy chọn mở rộng (không bắt buộc)

Nếu muốn lưu trữ riêng lý do trả hàng trong database, có thể thêm field vào Order schema:

#### `backend/src/modules/order/Order.js`

Thêm field vào schema:

```js
returnReason: {
  type: {
    type: String,
    enum: ["KHONG_NHAN", "HANG_LOI", "KHAC", null],
    default: null
  },
  detail: {
    type: String,
    default: ""
  },
  returnedAt: Date
}
```

#### `backend/src/modules/order/orderController.js`

Trong hàm `updateOrderStatus`, xử lý khi targetStatus là "RETURNED":

```js
if (targetStatus === "RETURNED") {
  order.returnReason = {
    type: req.body.returnReasonType || null,
    detail: note || "",
    returnedAt: new Date(),
  };
}
```

## Logic validation

1. **Bắt buộc chọn loại lý do**: Shipper phải chọn một trong 3 options
2. **Nếu chọn "Khác"**: Phải nhập chi tiết lý do
3. **Nếu chọn "Không nhận" hoặc "Hàng lỗi"**: Không bắt buộc nhập chi tiết (đã có default)

## UI/UX Requirements

1. Dropdown được hiển thị ngay khi mở dialog trả hàng
2. Khi chọn "Khác", mới hiện ô input để nhập chi tiết
3. Nút "Xác nhận Trả hàng" bị disabled cho đến khi chọn lý do (và nhập chi tiết nếu chọn "Khác")
4. Sau khi submit thành công, reset tất cả state về mặc định

## Testing Checklist

- [ ] Khi click "Trả hàng", dropdown hiển thị đầy đủ 3 options
- [ ] Chọn "Không nhận" → Không hiện ô input chi tiết, chỉ hiện hint
- [ ] Chọn "Hàng lỗi" → Không hiện ô input chi tiết, chỉ hiện hint
- [ ] Chọn "Khác" → Hiện ô input chi tiết bắt buộc
- [ ] Submit khi không chọn lý do → Hiện error message
- [ ] Submit khi chọn "Khác" mà không nhập chi tiết → Hiện error message
- [ ] Submit thành công → Đơn hàng chuyển sang trạng thái RETURNED với ghi chú đầy đủ
- [ ] Mở lại dialog → State được reset về mặc định
