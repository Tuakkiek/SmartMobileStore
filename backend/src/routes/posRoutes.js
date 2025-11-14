// backend/src/routes/posRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { restrictPOS, restrictAccountant } from "../middleware/posMiddleware.js";
import {
  createPOSOrder,
  getPOSOrders,
  issueVATInvoice,
  getPOSRevenue,
} from "../controllers/posController.js";

const router = express.Router();

// Tất cả routes yêu cầu đăng nhập
router.use(protect);

// ============================================
// POS STAFF ROUTES
// ============================================
router.post("/orders", restrictPOS, createPOSOrder);
router.get("/orders", restrictPOS, getPOSOrders);

// ============================================
// ACCOUNTANT ROUTES
// ============================================
router.post("/orders/:orderId/vat-invoice", restrictAccountant, issueVATInvoice);
router.get("/revenue", restrictAccountant, getPOSRevenue);

export default router;

