import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import {
  createPOSOrder,
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
  issueVATInvoice,
  getPOSOrderHistory,
  finalizePOSOrder,
  getPOSOrderById,
} from "./posController.js";

const router = express.Router();

const requireOrdersRead = authorize(AUTHZ_ACTIONS.ORDERS_READ, {
  scopeMode: "branch",
  requireActiveBranch: true,
  resourceType: "ORDER",
});

const requireOrdersWrite = authorize(AUTHZ_ACTIONS.ORDERS_WRITE, {
  scopeMode: "branch",
  requireActiveBranch: true,
  resourceType: "ORDER",
});

router.use(protect, resolveAccessContext);

router.post("/create-order", restrictTo("POS_STAFF", "ADMIN"), requireOrdersWrite, createPOSOrder);
router.get("/my-orders", restrictTo("POS_STAFF", "ADMIN"), requireOrdersRead, getPOSOrderHistory);
router.get("/orders/:id", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), requireOrdersRead, getPOSOrderById);

router.get("/pending-orders", restrictTo("CASHIER", "ADMIN"), requireOrdersRead, getPendingOrders);
router.post("/orders/:orderId/payment", restrictTo("CASHIER", "ADMIN"), requireOrdersWrite, processPayment);
router.post("/orders/:orderId/cancel", restrictTo("CASHIER", "ADMIN"), requireOrdersWrite, cancelPendingOrder);
router.post("/orders/:orderId/vat", restrictTo("CASHIER", "ADMIN"), requireOrdersWrite, issueVATInvoice);
router.put("/orders/:orderId/finalize", restrictTo("CASHIER", "ADMIN"), requireOrdersWrite, finalizePOSOrder);

router.get("/history", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), requireOrdersRead, getPOSOrderHistory);
router.get("/history/all", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), requireOrdersRead, getPOSOrderHistory);

export default router;
