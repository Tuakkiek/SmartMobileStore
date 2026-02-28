import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import { orderAuditMiddleware } from "./orderAuditMiddleware.js";
import { ORDER_AUDIT_ACTIONS } from "./orderAuditActions.js";
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

const auditCreatePOSOrder = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.CREATE_POS_ORDER,
  source: "POS_API",
});
const auditPOSPayment = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.PROCESS_POS_PAYMENT,
  source: "POS_API",
});
const auditPOSCancel = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.CANCEL_ORDER,
  source: "POS_API",
});
const auditPOSVat = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.ISSUE_POS_VAT_INVOICE,
  source: "POS_API",
});
const auditPOSFinalize = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.FINALIZE_POS_ORDER,
  source: "POS_API",
});

router.use(protect, resolveAccessContext);

router.post(
  "/create-order",
  restrictTo("POS_STAFF", "ADMIN"),
  requireOrdersWrite,
  auditCreatePOSOrder,
  createPOSOrder
);
router.get("/my-orders", restrictTo("POS_STAFF", "ADMIN"), requireOrdersRead, getPOSOrderHistory);
router.get("/orders/:id", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), requireOrdersRead, getPOSOrderById);

router.get("/pending-orders", restrictTo("CASHIER", "ADMIN"), requireOrdersRead, getPendingOrders);
router.post(
  "/orders/:orderId/payment",
  restrictTo("CASHIER", "ADMIN"),
  requireOrdersWrite,
  auditPOSPayment,
  processPayment
);
router.post(
  "/orders/:orderId/cancel",
  restrictTo("CASHIER", "ADMIN"),
  requireOrdersWrite,
  auditPOSCancel,
  cancelPendingOrder
);
router.post(
  "/orders/:orderId/vat",
  restrictTo("CASHIER", "ADMIN"),
  requireOrdersWrite,
  auditPOSVat,
  issueVATInvoice
);
router.put(
  "/orders/:orderId/finalize",
  restrictTo("CASHIER", "ADMIN"),
  requireOrdersWrite,
  auditPOSFinalize,
  finalizePOSOrder
);

router.get("/history", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), requireOrdersRead, getPOSOrderHistory);
router.get("/history/all", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), requireOrdersRead, getPOSOrderHistory);

export default router;
