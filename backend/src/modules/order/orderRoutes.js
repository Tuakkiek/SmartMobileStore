// ============================================
// FILE: backend/src/modules/order/orderRoutes.js
// Routes cho quản lý đơn hàng
// ============================================

import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import * as orderController from "./orderController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// PUBLIC ROUTES (Authenticated users)
// ============================================

// Get all orders (with filters)
// CUSTOMER: see only their orders
// ADMIN/ORDER_MANAGER: see all orders
router.get("/all", orderController.getAllOrders);
router.get("/", orderController.getAllOrders);

// Legacy endpoint used by old frontend builds
router.get("/my-orders", orderController.getAllOrders);

// Get order statistics
router.get(
  "/stats/summary",
  restrictTo("ADMIN", "ORDER_MANAGER"),
  orderController.getOrderStats
);

// Get order by ID
router.get("/:id", orderController.getOrderById);

// Create new order
router.post("/", orderController.createOrder);

// Cancel order (customer can cancel their own orders)
router.patch("/:id/cancel", orderController.cancelOrder);

// ============================================
// ADMIN/ORDER_MANAGER ONLY ROUTES
// ============================================

// Update order status
router.patch(
  "/:id/status",
  restrictTo("ADMIN", "ORDER_MANAGER", "WAREHOUSE_STAFF"),
  orderController.updateOrderStatus
);

// Update payment status
router.patch(
  "/:id/payment",
  restrictTo("ADMIN", "ORDER_MANAGER"),
  orderController.updatePaymentStatus
);

export default router;
