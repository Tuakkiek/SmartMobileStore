import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import { getOrderAuditLogsAdmin } from "./orderAuditAdminController.js";

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

router.use(protect, resolveAccessContext, requireOrderAuditRole);

router.get(
  "/orders",
  authorize(AUTHZ_ACTIONS.ORDERS_READ, {
    scopeMode: resolveAuditScopeMode,
    requireActiveBranchFor: ["branch"],
    resourceType: "ORDER_AUDIT",
  }),
  getOrderAuditLogsAdmin
);

export default router;
