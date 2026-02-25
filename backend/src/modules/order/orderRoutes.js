import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import * as orderController from "./orderController.js";

const router = express.Router();

// Carrier webhooks are unauthenticated
router.post("/carrier/webhook", orderController.handleCarrierWebhook);
router.put("/carrier/webhook", orderController.handleCarrierWebhook);

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
router.get("/:id", orderController.getOrderById);

router.post("/", orderController.createOrder);

router.patch("/:id/cancel", orderController.cancelOrder);
router.post("/:id/cancel", orderController.cancelOrder);

router.patch(
  "/:id/status",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.updateOrderStatus
);
router.put(
  "/:id/status",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.updateOrderStatus
);

router.patch(
  "/:id/assign-carrier",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.assignCarrier
);
router.put(
  "/:id/assign-carrier",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.assignCarrier
);

router.patch(
  "/:id/payment",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.updatePaymentStatus
);
router.put(
  "/:id/payment",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "branch", requireActiveBranch: true, resourceType: "ORDER" }),
  orderController.updatePaymentStatus
);

router.patch(
  "/:id/assign-store",
  authorize(AUTHZ_ACTIONS.ORDERS_WRITE, { scopeMode: "global", resourceType: "ORDER" }),
  orderController.assignStore
);

export default router;
