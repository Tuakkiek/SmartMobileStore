import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import * as orderController from "./orderController.js";
import { getOrderAuditLogs } from "./orderAuditController.js";
import { ORDER_AUDIT_ACTIONS } from "./orderAuditActions.js";
import { orderAuditMiddleware } from "./orderAuditMiddleware.js";
import { resolveOrderIdFromCarrierPayload } from "./orderAuditAdapter.js";

const router = express.Router();

const ALLOWED_AUDIT_ROLES = new Set([
  "GLOBAL_ADMIN",
  "ADMIN",
  "BRANCH_ADMIN",
  "ORDER_MANAGER",
]);

const requireOrderAuditRole = (req, res, next) => {
  const role = String(req?.user?.role || "").toUpperCase();
  if (!ALLOWED_AUDIT_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      code: "AUTHZ_AUDIT_ROLE_DENIED",
      message: "You do not have permission to access order audit logs",
    });
  }
  return next();
};

const resolveAuditScopeMode = (req) => {
  if (req?.authz?.isGlobalAdmin || req?.user?.role === "GLOBAL_ADMIN") {
    return "global";
  }
  return "branch";
};

const auditCreateOrder = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.CREATE_ORDER,
  source: "ORDERS_API",
});
const auditCancelOrder = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.CANCEL_ORDER,
  source: "ORDERS_API",
});
const auditUpdateStatus = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.UPDATE_STATUS,
  source: "ORDERS_API",
});
const auditAssignCarrier = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.ASSIGN_CARRIER,
  source: "ORDERS_API",
});
const auditUpdatePaymentStatus = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.UPDATE_PAYMENT_STATUS,
  source: "ORDERS_API",
});
const auditAssignBranch = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.ASSIGN_BRANCH,
  source: "ORDERS_API",
});
const auditCarrierWebhook = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.PROCESS_CARRIER_WEBHOOK,
  source: "CARRIER_WEBHOOK",
  resolveOrderId: async (req) => resolveOrderIdFromCarrierPayload(req.body || {}),
});

const resolveOrderStatusWriteAction = (req) => {
  const role = String(req?.user?.role || "").toUpperCase();
  if (role === "WAREHOUSE_MANAGER" || role === "WAREHOUSE_STAFF") {
    return AUTHZ_ACTIONS.WAREHOUSE_WRITE;
  }
  return AUTHZ_ACTIONS.ORDERS_WRITE;
};

// Carrier webhooks are unauthenticated
router.post("/carrier/webhook", auditCarrierWebhook, orderController.handleCarrierWebhook);
router.put("/carrier/webhook", auditCarrierWebhook, orderController.handleCarrierWebhook);

// // All other routes require auth + branch context
router.use(protect, resolveAccessContext);

router.get(
  "/stats/summary",
  authorize(AUTHZ_ACTIONS.ORDERS_READ, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.getOrderStats
);

router.get("/all", orderController.getAllOrders);
router.get("/", orderController.getAllOrders);
router.get("/my-orders", orderController.getAllOrders);
router.get(
  "/:id/audit-logs",
  requireOrderAuditRole,
  authorize(AUTHZ_ACTIONS.ORDERS_READ, {
    scopeMode: resolveAuditScopeMode,
    requireActiveBranchFor: ["branch"],
    resourceType: "ORDER_AUDIT",
  }),
  getOrderAuditLogs
);
router.get("/:id", orderController.getOrderById);

router.post("/", auditCreateOrder, orderController.createOrder);

router.patch("/:id/cancel", auditCancelOrder, orderController.cancelOrder);
router.post("/:id/cancel", auditCancelOrder, orderController.cancelOrder);

router.patch(
  "/:id/status",
  authorize(resolveOrderStatusWriteAction, {
    scopeMode: "branch",
    requireActiveBranch: true,
    resourceType: "ORDER",
  }),
  auditUpdateStatus,
  orderController.updateOrderStatus
);
router.put(
  "/:id/status",
  authorize(resolveOrderStatusWriteAction, {
    scopeMode: "branch",
    requireActiveBranch: true,
    resourceType: "ORDER",
  }),
  auditUpdateStatus,
  orderController.updateOrderStatus
);

router.patch(
  "/:id/assign-carrier",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  auditAssignCarrier,
  orderController.assignCarrier
);
router.put(
  "/:id/assign-carrier",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  auditAssignCarrier,
  orderController.assignCarrier
);

router.patch(
  "/:id/payment",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  auditUpdatePaymentStatus,
  orderController.updatePaymentStatus
);
router.put(
  "/:id/payment",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  auditUpdatePaymentStatus,
  orderController.updatePaymentStatus
);

router.patch(
  "/:id/assign-store",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "global", resourceType: "ORDER" }),
  auditAssignBranch,
  orderController.assignStore
);

export default router;
