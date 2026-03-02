# PROMPT XỬ LÝ TRẢ HÀNG - CẬP NHẬT TỒN KHO

## Yêu cầu:

Khi shipper giao hàng cho khách hàng mà khách hàng từ chối nhận (chọn "Trả hàng"), hệ thống cần:

1. Cập nhật trạng thái đơn hàng thành RETURNED hoặc DELIVERY_FAILED
2. Cộng lại số lượng sản phẩm vào vị trí kho nơi đã lấy hàng (original location)
3. Tạo bản ghi StockMovement để ghi nhận việc hoàn trả hàng
4. Cập nhật lại số lượng tồn kho đúng

## Bối cảnh hiện tại:

- Hệ thống hiện tại đã có: Order, Inventory, WarehouseLocation, StockMovement
- Đã có hàm restorePickedInventoryForExchange trong orderController.js để khôi phục hàng khi đổi máy
- Đơn hàng có trường inventoryDeductedAt để kiểm tra đã trừ kho hay chưa
- Mỗi item trong order có: variantSku, quantity, productId

## Chi tiết triển khai:

### 1. Tạo hàm restoreInventoryForReturn({ order, user, session, reason }):

- Tìm các StockMovement liên quan đến order (referenceType: "ORDER", referenceId: order.\_id)
- Nhóm theo SKU và locationId
- Tính toán số lượng cần hoàn trả = outboundQty - inboundQty
- Cập nhật Inventory.quantity += toRestore theo sku và locationId
- Cập nhật WarehouseLocation.currentLoad += toRestore
- Tạo StockMovement mới với type: "INBOUND", note: "Hoàn trả từ giao hàng thất bại"

### 2. Tích hợp vào updateOrderStatus():

Khi targetStatus là "RETURNED" hoặc "DELIVERY_FAILED":

- Kiểm tra nếu order.inventoryDeductedAt tồn tại
- Gọi restoreInventoryForReturn()
- Cập nhật order.returnedAt = new Date()

### 3. Tích hợp vào handleCarrierWebhook():

Khi normalizedEventType là "RETURNED" hoặc "DELIVERY_FAILED":

- Gọi restoreInventoryForReturn() sau khi cập nhật status

## Files cần chỉnh sửa:

- backend/src/modules/order/orderController.js

## Kết quả mong đợi:

- Shipper chọn "Trả hàng" → hệ thống tự động cộng lại sản phẩm vào kho
- Số lượng tồn kho được cập nhật chính xác
- Lịch sử di chuyển hàng được ghi nhận đầy đủ
