// ============================================
// FILE: backend/src/modules/warehouse/warehouseRoutes.js
// Routes cho module warehouse
// ============================================

import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import * as warehouseController from "./warehouseController.js";
import * as goodsReceiptController from "./goodsReceiptController.js";
import * as stockOperationsController from "./stockOperationsController.js";

const router = express.Router();

// ============================================
// WAREHOUSE LOCATIONS
// ============================================

// Tạo cấu trúc kho (Admin only)
router.post(
  "/locations/generate",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.generateWarehouseStructure
);

// Lấy danh sách vị trí
router.get(
  "/locations",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.getAllLocations
);

// Lấy chi tiết vị trí
router.get(
  "/locations/:locationCode",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.getLocationDetail
);

// Đề xuất vị trí lưu kho
router.post(
  "/locations/suggest",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  warehouseController.suggestLocation
);

// ============================================
// INVENTORY
// ============================================

// Tìm kiếm tồn kho
router.get(
  "/inventory/search",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.searchInventory
);

// ============================================
// PURCHASE ORDERS
// ============================================

// Tạo PO
router.post(
  "/purchase-orders",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.createPurchaseOrder
);

// Lấy danh sách PO
router.get(
  "/purchase-orders",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.getPurchaseOrders
);

// Lấy chi tiết PO
router.get(
  "/purchase-orders/:id",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.getPurchaseOrderDetail
);

// Duyệt PO
router.put(
  "/purchase-orders/:id/approve",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  warehouseController.approvePurchaseOrder
);

// ============================================
// GOODS RECEIPT (Nhận hàng)
// ============================================

// Bắt đầu nhận hàng
router.post(
  "/goods-receipt/start",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  goodsReceiptController.startGoodsReceipt
);

// Nhận từng SKU
router.post(
  "/goods-receipt/receive-item",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  goodsReceiptController.receiveItem
);

// Hoàn tất nhận hàng
router.post(
  "/goods-receipt/complete",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  goodsReceiptController.completeGoodsReceipt
);

// Lấy danh sách GRN
router.get(
  "/goods-receipt",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  goodsReceiptController.getGoodsReceipts
);

// ============================================
// STOCK OPERATIONS (Xuất/Chuyển kho)
// ============================================

// Lấy pick list cho đơn hàng
router.get(
  "/pick-list/:orderId",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  stockOperationsController.getPickList
);

// Xác nhận lấy hàng
router.post(
  "/pick",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  stockOperationsController.pickItem
);

// Chuyển kho nội bộ
router.post(
  "/transfer",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  stockOperationsController.transferStock
);

// ============================================
// CYCLE COUNT (Kiểm kê)
// ============================================

// Tạo phiếu kiểm kê
router.post(
  "/cycle-count",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  stockOperationsController.createCycleCount
);

// Lấy danh sách phiếu kiểm kê
router.get(
  "/cycle-count",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  stockOperationsController.getCycleCounts
);

// Cập nhật kết quả kiểm kê
router.put(
  "/cycle-count/:id/update-item",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  stockOperationsController.updateCycleCountItem
);

// Hoàn thành kiểm kê
router.put(
  "/cycle-count/:id/complete",
  protect,
  restrictTo("WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"),
  stockOperationsController.completeCycleCount
);

// Duyệt kiểm kê
router.put(
  "/cycle-count/:id/approve",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  stockOperationsController.approveCycleCount
);

export default router;
