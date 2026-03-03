Test: Luồng hoạt động đơn hàng từ đặt hàng đến giao hàng

## Mô tả yêu cầu

Viết script/code test để kiểm tra luồng hoạt động sau:

1. Khách hàng đặt hàng
2. Admin Global duyệt đơn và chuyển sang chi nhánh con
3. Shipper xác nhận đã giao cho khách hàng
4. Kiểm tra xem số lượng sản phẩm trong kho (Inventory) có được trừ đi đúng hay không

---

## Phân tích luồng hoạt động hiện tại

### 1. Khách hàng đặt hàng (`createOrder` - orderController.js)

- Khi khách hàng tạo đơn hàng:
  - Nếu có `preferredStoreId` (chọn cửa hàng nhận hàng), hệ thống sẽ **reserve** (giữ chỗ) inventory trong `StoreInventory.reserved`
  - Số lượng trong `StoreInventory.quantity` **chưa bị trừ** ở bước này
  - Đơn hàng có trạng thái ban đầu: `PENDING` hoặc `PENDING_PAYMENT`

### 2. Admin Global duyệt đơn và chuyển chi nhánh (`assignStore` hoặc `updateOrderStatus`)

- Khi Admin Global chuyển đơn sang chi nhánh khác (`assignStore`):
  - **Release** inventory khỏi chi nhánh cũ (nếu có)
  - **Reserve** inventory ở chi nhánh mới
  - Cập nhật `order.assignedStore` với thông tin chi nhánh mới

### 3. Shipper xác nhận giao hàng (`updateOrderStatus` -> DELIVERED)

- Khi đơn hàng chuyển sang trạng thái `DELIVERED`:
  - Code hiện tại kiểm tra: `if (order.assignedStore?.storeId && !order.inventoryDeductedAt)`
  - Gọi `routingService.deductInventory()` để trừ số lượng trong kho
  - Đặt `order.inventoryDeductedAt = new Date()`

---

## Các vấn đề tiềm ẩn cần kiểm tra

### Vấn đề 1: Ai có thể chuyển trạng thái DELIVERED?

- Hiện tại, bất kỳ user nào có quyền đều có thể chuyển sang `DELIVERED`
- **Cần kiểm tra**: Chỉ Shipper được gán cho đơn hàng mới được xác nhận đã giao

### Vấn đề 2: Inventory có được trừ đúng thời điểm không?

- **Yêu cầu**: Chỉ trừ inventory khi Shipper xác nhận đã giao
- **Hiện tại**: Code trừ inventory khi bất kỳ ai chuyển sang DELIVERED

### Vấn đề 3: Trừ inventory ở đâu?

- Cần kiểm tra xem inventory được trừ ở `StoreInventory` (store level) hay `Inventory` (warehouse level)
- Xem xét logic trong `routingService.deductInventory()`

### Vấn đề 4: Luồng chuyển chi nhánh

- Khi Admin chuyển đơn sang chi nhánh khác, inventory có được xử lý đúng không?
- Release ở chi nhánh cũ → Reserve ở chi nhánh mới

---

## Script Test mẫu (JavaScript/Node.js)

```
javascript
/**
 * Test Case: Kiểm tra luồng hoạt động đơn hàng
 * 1. Khách hàng đặt hàng
 * 2. Admin Global duyệt và chuyển chi nhánh
 * 3. Shipper xác nhận giao hàng
 * 4. Kiểm tra inventory
 */

const mongoose = require('mongoose');

// Kết nối database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartmobile';

async function testOrderWorkflow() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  try {
    // ===== BƯỚC 1: Khách hàng đặt hàng =====
    console.log('\n=== BƯỚC 1: Khách hàng đặt hàng ===');

    // Tạo đơn hàng test
    const orderData = {
      items: [
        {
          variantSku: 'IP17-PRO-256-BLACK',
          quantity: 1,
          price: 25000000
        }
      ],
      fulfillmentType: 'HOME_DELIVERY',
      shippingAddress: {
        fullName: 'Nguyễn Văn A',
        phoneNumber: '0912345678',
        detailAddress: '123 Đường ABC',
        province: 'TP.HCM',
        district: 'Quận 1'
      },
      paymentMethod: 'COD',
      preferredStoreId: null // Không chọn store trước
    };

    // Gọi API tạo đơn hàng với user khách hàng
    const createOrderResponse = await callApi('POST', '/api/orders', orderData, customerToken);
    const order = createOrderResponse.order;
    console.log(`✅ Đơn hàng tạo: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Assigned Store: ${order.assignedStore?.storeName || 'Chưa gán'}`);

    // Kiểm tra inventory ban đầu
    const initialInventory = await getStoreInventory(storeId, 'IP17-PRO-256-BLACK');
    console.log(`   Inventory ban đầu: ${initialInventory.quantity} (reserved: ${initialInventory.reserved})`);


    // ===== BƯỚC 2: Admin Global duyệt đơn và chuyển chi nhánh =====
    console.log('\n=== BƯỚC 2: Admin Global duyệt và chuyển chi nhánh ===');

    // Admin gán đơn hàng cho chi nhánh
    const branchId = 'BRANCH_HCM_ID'; // ID chi nhánh HCM
    const assignStoreResponse = await callApi('PATCH', `/api/orders/${order._id}/assign-store`,
      { storeId: branchId }, adminGlobalToken);

    console.log(`✅ Đơn hàng đã gán cho chi nhánh: ${assignStoreResponse.order.assignedStore.storeName}`);

    // Kiểm tra inventory sau khi gán chi nhánh
    const afterAssignInventory = await getStoreInventory(branchId, 'IP17-PRO-256-BLACK');
    console.log(`   Inventory sau assign: ${afterAssignInventory.quantity} (reserved: ${afterAssignInventory.reserved})`);

    // Admin xác nhận đơn hàng (chuyển sang CONFIRMED/PROCESSING)
    const confirmResponse = await callApi('PATCH', `/api/orders/${order._id}/status`,
      { status: 'CONFIRMED' }, adminGlobalToken);
    console.log(`✅ Admin xác nhận đơn: ${confirmResponse.order.status}`);

    // Gán shipper cho đơn hàng
    const shipperId = 'SHIPPER_ID';
    const assignShipperResponse = await callApi('PATCH', `/api/orders/${order._id}/assign-carrier`,
      { shipperId }, adminGlobalToken);
    console.log(`✅ Shipper được gán: ${assignShipperResponse.order.shipperInfo.shipperName}`);

    // Cập nhật trạng thái sang SHIPPING (chuẩn bị giao)
    const shippingResponse = await callApi('PATCH', `/api/orders/${order._id}/status`,
      { status: 'SHIPPING' }, adminGlobalToken);
    console.log(`✅ Trạng thái chuyển sang SHIPPING: ${shippingResponse.order.status}`);


    // ===== BƯỚC 3: Shipper xác nhận đã giao hàng =====
    console.log('\n=== BƯỚC 3: Shipper xác nhận đã giao hàng ===');

    // Shipper cập nhật trạng thái DELIVERED
    const deliveredResponse = await callApi('PATCH', `/api/orders/${order._id}/status',
      { status: 'DELIVERED', note: 'Giao hàng thành công' }, shipperToken);

    console.log(`✅ Shipper xác nhận đã giao: ${deliveredResponse.order.status}`);
    console.log(`   DeliveredAt: ${deliveredResponse.order.deliveredAt}`);
    console.log(`   InventoryDeductedAt: ${deliveredResponse.order.inventoryDeductedAt}`);


    // ===== BƯỚC 4: Kiểm tra inventory sau khi giao hàng =====
    console.log('\n=== BƯỚC 4: Kiểm tra inventory ===');

    const finalInventory = await getStoreInventory(branchId, 'IP17-PRO-256-BLACK');
    console.log(`   Inventory cuối: ${finalInventory.quantity} (reserved: ${finalInventory.reserved})`);
    console.log(`   Số lượng đã trừ: ${initialInventory.quantity - finalInventory.quantity}`);

    // ===== ASSERTIONS =====
    console.log('\n=== KẾT QUẢ KIỂM TRA ===');

    // 1. Kiểm tra đơn hàng đã được gán chi nhánh
    assert(deliveredResponse.order.assignedStore?.storeId === branchId,
      '❌ Đơn hàng phải được gán cho chi nhánh');

    // 2. Kiểm tra inventory đã được trừ
    const inventoryDeducted = initialInventory.quantity - finalInventory.quantity;
    assert(inventoryDeducted === 1,
      `❌ Inventory phải trừ 1, nhưng trừ ${inventoryDeducted}`);

    // 3. Kiểm tra thời điểm trừ inventory
    assert(deliveredResponse.order.inventoryDeductedAt !== null,
      '❌ Phải có inventoryDeductedAt');

    // 4. Kiểm tra chỉ shipper mới được xác nhận giao (nếu có logic này)
    // Hiện tại code cho phép admin cũng có thể chuyển sang DELIVERED
    // Cần kiểm tra xem đây có phải là hành vi mong muốn không

    console.log('✅ Tất cả kiểm tra đã hoàn thành!');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  }
}

// Helper functions
async function callApi(method, endpoint, data, token) {
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'API call failed');
  }
  return result;
}

async function getStoreInventory(storeId, sku) {
  // Truy vấn StoreInventory collection
  const StoreInventory = mongoose.model('StoreInventory');
  return await StoreInventory.findOne({ storeId, variantSku: sku });
}

function assert(condition, message) {
  if (condition) {
    console.log(`   ✓ ${message.replace('❌', '')}`);
  } else {
    console.log(`   ${message}`);
  }
}

// Chạy test
testOrderWorkflow();
```

---

## Checklist kiểm tra chi tiết

### ✅ Chức năng hoạt động đúng

- [ ] Khách hàng có thể tạo đơn hàng thành công
- [ ] Admin Global có thể xem và xử lý đơn hàng ở mọi chi nhánh
- [ ] Admin Global có thể chuyển đơn hàng sang chi nhánh khác
- [ ] Khi chuyển chi nhánh, inventory được release ở chi cũ và reserve ở chi nhánh mới
- [ ] Shipper được gán cho đơn hàng có thể cập nhật trạng thái giao hàng
- [ ] Khi chuyển sang DELIVERED, inventory được trừ trong kho

### ⚠️ Cần xem xét/fix

- [ ] **Quyền DELIVERED**: Chỉ shipper được gán cho đơn mới được chuyển sang DELIVERED, hay admin cũng có thể?
- [ ] **Thời điểm trừ inventory**: Hiện tại trừ khi status = DELIVERED, có cần thêm điều kiện người thực hiện là shipper không?
- [ ] **Warehouse vs Store Inventory**: Cần làm rõ nên trừ ở level nào (StoreInventory hay Inventory)
- [ ] **Trường hợp đặc biệt**: Đơn hàng COD, đơn hàng đã thanh toán trước, đơn trả hàng

---

## Prompt gốc (để tham khảo)

> giúp tôi kiểm tra xem luồng hoạt động bắt đầu từ lúc khách hàng đặt hàng Admin Global duyệt đơn -> chuyển sang chi nhánh con cho đến khi mà shipper xác nhận đã giao cho khách hàng có hoạt động đúng hay không, số lượng sản phẩm trong kho có trừ đi không?

---

## Kết luận sơ bộ

Dựa trên phân tích code:

1. **Luồng hoạt động cơ bản đúng**: Customer → Admin assign branch → Shipper deliver
2. **Inventory được trừ** khi status = DELIVERED (thông qua `routingService.deductInventory()`)
3. **Cần lưu ý**: Code hiện tại cho phép bất kỳ user nào có quyền chuyển sang DELIVERED, không chỉ shipper được gán

