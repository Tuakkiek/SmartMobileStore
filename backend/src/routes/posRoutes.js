// ============================================
// FILE: backend/src/routes/posRoutes.js
// ĐÃ SỬA: DÙNG LẠI getOrderById + QUYỀN CHO POS_STAFF
// ============================================

import express from "express";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import {
  createPOSOrder,
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
  issueVATInvoice,
  getPOSOrderHistory,
} from "../controllers/posController.js";

// ✅ IMPORT getOrderById TỪ ORDER CONTROLLER (TÁI SỬ DỤNG)
import { getOrderById } from "../controllers/orderController.js";

const router = express.Router();

// ✅ TẤT CẢ ROUTES REQUIRE AUTHENTICATION
router.use(protect);

// ============================================
// POS STAFF ROUTES
// ============================================

// Tạo đơn hàng POS
router.post("/create-order", restrictTo("POS_STAFF", "ADMIN"), createPOSOrder);

// Lấy lịch sử đơn của mình (danh sách)
router.get("/my-orders", restrictTo("POS_STAFF", "ADMIN"), getPOSOrderHistory);

// ✅ THÊM: LẤY CHI TIẾT ĐƠN HÀNG (DÙNG LẠI TỪ ORDER CONTROLLER)
router.get(
  "/orders/:id",
  restrictTo("POS_STAFF", "ADMIN"),
  getOrderById // ← TÁI SỬ DỤNG, ĐÃ CÓ KIỂM TRA QUYỀN
);

// ============================================
// ACCOUNTANT ROUTES
// ============================================

// Lấy danh sách đơn chờ thanh toán
router.get(
  "/pending-orders",
  restrictTo("ACCOUNTANT", "ADMIN"),
  getPendingOrders
);

// Xử lý thanh toán
router.post(
  "/process-payment/:orderId",
  restrictTo("ACCOUNTANT", "ADMIN"),
  processPayment
);

// Hủy đơn chờ thanh toán
router.post(
  "/cancel-order/:orderId",
  restrictTo("ACCOUNTANT", "ADMIN"),
  cancelPendingOrder
);

// Xuất hóa đơn VAT
router.post(
  "/issue-vat/:orderId",
  restrictTo("ACCOUNTANT", "ADMIN"),
  issueVATInvoice
);

// ✅ TÙY CHỌN: Nếu ACCOUNTANT muốn xem tất cả đơn (không cần thiết)
// router.get(
//   "/orders",
//   restrictTo("POS_STAFF", "ACCOUNTANT", "ADMIN"),
//   getPOSOrderHistory
// );

export default router;
