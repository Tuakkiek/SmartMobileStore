import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
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

const resolvePosScopeMode = (req) => {
  if (req?.authz?.isGlobalAdmin || req?.user?.role === "GLOBAL_ADMIN") {
    return "global";
  }
  return "branch";
};

const requireOrdersRead = authorize(AUTHZ_ACTIONS.ORDERS_READ, {
  scopeMode: resolvePosScopeMode,
  requireActiveBranchFor: ["branch"],
  resourceType: "ORDER",
});

const requireOrdersWrite = authorize(AUTHZ_ACTIONS.ORDERS_WRITE, {
  scopeMode: resolvePosScopeMode,
  requireActiveBranchFor: ["branch"],
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
  requireOrdersWrite,
  auditCreatePOSOrder,
  createPOSOrder
);
router.get("/my-orders", requireOrdersRead, getPOSOrderHistory);
router.get("/orders/:id", requireOrdersRead, getPOSOrderById);

router.get("/pending-orders", requireOrdersRead, getPendingOrders);
router.post(
  "/orders/:orderId/payment",
  requireOrdersWrite,
  auditPOSPayment,
  processPayment
);
router.post(
  "/orders/:orderId/cancel",
  requireOrdersWrite,
  auditPOSCancel,
  cancelPendingOrder
);
router.post(
  "/orders/:orderId/vat",
  requireOrdersWrite,
  auditPOSVat,
  issueVATInvoice
);
router.put(
  "/orders/:orderId/finalize",
  requireOrdersWrite,
  auditPOSFinalize,
  finalizePOSOrder
);

router.get("/history", requireOrdersRead, getPOSOrderHistory);
router.get("/history/all", requireOrdersRead, getPOSOrderHistory);

export default router;
