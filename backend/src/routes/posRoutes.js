// ============================================
// FILE: backend/src/routes/posRoutes.js
// ✅ V2: Routes cho POS và Kế toán
// ============================================

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  restrictPOS,
  restrictAccountant,
} from "../middleware/posMiddleware.js";
import {
  createPOSOrder,
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
  issueVATInvoice,
  getPOSOrderHistory,
} from "../controllers/posController.js";

const router = express.Router();

// Tất cả routes yêu cầu đăng nhập
router.use(protect);

// ============================================
// POS STAFF ROUTES
// ============================================

// Tạo đơn hàng POS (POS Staff)
router.post("/create-order", restrictPOS, createPOSOrder);

// Lấy lịch sử đơn của mình (POS Staff)
router.get("/my-orders", restrictPOS, getPOSOrderHistory);

// ============================================
// ACCOUNTANT ROUTES
// ============================================

// Lấy danh sách đơn chờ thanh toán (Kế toán)
router.get("/pending-orders", restrictAccountant, getPendingOrders);

// Xử lý thanh toán (Kế toán)
router.post("/process-payment/:orderId", restrictAccountant, processPayment);

// Hủy đơn chờ thanh toán (Kế toán)
router.post("/cancel-order/:orderId", restrictAccountant, cancelPendingOrder);

// Xuất hóa đơn VAT (Kế toán)
router.post("/issue-vat/:orderId", restrictAccountant, issueVATInvoice);

export default router;
