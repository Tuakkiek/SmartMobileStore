# PROMPT: Thêm thông tin người xuất kho vào đơn hàng

## Yêu cầu

Bạn hãy triển khai tính năng lưu thông tin chi tiết người xuất kho (warehouse picker) vào đơn hàng khi thực hiện thao tác xuất kho.

## Chi tiết cần thực hiện

### 1. Cập nhật Order Schema (`backend/src/modules/order/Order.js`)

Thêm trường mới `shippedByInfo` vào schema để lưu thông tin người xuất kho:

```
javascript
shippedByInfo: {
  shippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  shippedByName: String,
  shippedAt: Date,
  shippedNote: String,
  items: [
    {
      sku: String,
      quantity: Number,
      locationCode: String
    }
  ]
},
```

### 2. Cập nhật controller xuất kho (`backend/src/modules/warehouse/stockOperationsController.js`)

Trong function `pickItem`, sau khi trừ tồn kho thành công, cập nhật thông tin người xuất kho vào đơn hàng:

- Lấy thông tin người thực hiện từ `req.user`
- Cập nhật `order.shippedByInfo` với:
  - `shippedBy`: ID của user thực hiện
  - `shippedByName`: Tên user thực hiện (sử dụng `getActorName(req.user)`)
  - `shippedAt`: Thời điểm xuất kho
  - `items`: Danh sách các item đã xuất kho (sku, quantity, locationCode)

### 3. Cập nhật status history (`backend/src/modules/warehouse/stockOperationsController.js`)

Khi xuất kho thành công, thêm entry vào `order.statusHistory` với:

- status: "SHIPPING" (hoặc trạng thái phù hợp với flow hiện tại)
- updatedBy: ID của người xuất kho
- note: "Xuất kho thành công" hoặc mô tả chi tiết hơn

## Thông tin bổ sung

- Sử dụng transaction (`mongoose.startSession()`) để đảm bảo tính toàn vẹn dữ liệu
- Kiểm tra logic xuất kho hoàn tất (khi tất cả items đã được pick) để cập nhật trạng thái đơn hàng
- Giữ nguyên logic kiểm tra quyền hiện tại (`WAREHOUSE_MANAGER`, `ADMIN`, `GLOBAL_ADMIN`)
- Tham khảo các trường tương tự trong Order.js như `pickerInfo`, `shipperInfo`, `createdByInfo` để đảm bảo tính nhất quán

## Files cần chỉnh sửa

1. `backend/src/modules/order/Order.js` - Thêm schema `shippedByInfo`
2. `backend/src/modules/warehouse/stockOperationsController.js` - Cập nhật logic trong function `pickItem`
