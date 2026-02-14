import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import * as orderController from "./orderController.js";

const router = express.Router();

router.post("/carrier/webhook", orderController.handleCarrierWebhook);
router.put("/carrier/webhook", orderController.handleCarrierWebhook);

router.use(protect);

router.get(
  "/stats/summary",
  restrictTo("ADMIN", "ORDER_MANAGER"),
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
  restrictTo("ADMIN", "ORDER_MANAGER", "WAREHOUSE_MANAGER", "SHIPPER"),
  orderController.updateOrderStatus
);
router.put(
  "/:id/status",
  restrictTo("ADMIN", "ORDER_MANAGER", "WAREHOUSE_MANAGER", "SHIPPER"),
  orderController.updateOrderStatus
);

router.patch(
  "/:id/assign-carrier",
  restrictTo("ADMIN", "ORDER_MANAGER"),
  orderController.assignCarrier
);
router.put(
  "/:id/assign-carrier",
  restrictTo("ADMIN", "ORDER_MANAGER"),
  orderController.assignCarrier
);

router.patch(
  "/:id/payment",
  restrictTo("ADMIN", "ORDER_MANAGER"),
  orderController.updatePaymentStatus
);
router.put(
  "/:id/payment",
  restrictTo("ADMIN", "ORDER_MANAGER"),
  orderController.updatePaymentStatus
);

export default router;
