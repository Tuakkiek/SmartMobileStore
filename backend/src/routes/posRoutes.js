// ============================================
// FILE: backend/src/routes/posRoutes.js
// ✅ FIXED: Dùng restrictTo như các route khác
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

const router = express.Router();

// ✅ TẤT CẢ ROUTES REQUIRE AUTHENTICATION
router.use(protect);

// ============================================
// POS STAFF ROUTES - Dùng restrictTo thay vì restrictPOS
// ============================================

// Tạo đơn hàng POS (POS Staff + Admin)
router.post("/create-order", restrictTo("POS_STAFF", "ADMIN"), createPOSOrder);

// Lấy lịch sử đơn của mình (POS Staff + Admin)
router.get("/my-orders", restrictTo("POS_STAFF", "ADMIN"), getPOSOrderHistory);

// ============================================
// ACCOUNTANT ROUTES - Dùng restrictTo thay vì restrictAccountant
// ============================================

// Lấy danh sách đơn chờ thanh toán (Kế toán + Admin)
router.get(
  "/pending-orders",
  restrictTo("ACCOUNTANT", "ADMIN"),
  getPendingOrders
);

// Xử lý thanh toán (Kế toán + Admin)
router.post(
  "/process-payment/:orderId",
  restrictTo("ACCOUNTANT", "ADMIN"),
  processPayment
);

// Hủy đơn chờ thanh toán (Kế toán + Admin)
router.post(
  "/cancel-order/:orderId",
  restrictTo("ACCOUNTANT", "ADMIN"),
  cancelPendingOrder
);

// Xuất hóa đơn VAT (Kế toán + Admin)
router.post(
  "/issue-vat/:orderId",
  restrictTo("ACCOUNTANT", "ADMIN"),
  issueVATInvoice
);

// ✅ THÊM ROUTE ĐỂ LẤY LỊCH SỬ ĐƠN CHO POS (dùng trong POSOrderHistory)
router.get(
  "/orders",
  restrictTo("POS_STAFF", "ACCOUNTANT", "ADMIN"), // ← Thêm ACCOUNTANT
  getPOSOrderHistory
);
export default router;
