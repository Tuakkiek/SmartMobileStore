// ============================================
// FILE: backend/src/modules/warehouse/warehouseConfigRoutes.js
// Routes cho quản lý cấu hình kho
// ============================================

import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import * as configController from "./warehouseConfigController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// WAREHOUSE CONFIGURATION CRUD
// ============================================

// Get all warehouses
router.get(
  "/",
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  configController.getAllWarehouses
);

// Get warehouse by ID
router.get(
  "/:id",
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  configController.getWarehouseById
);

// Create new warehouse
router.post(
  "/",
  restrictTo("ADMIN"),
  configController.createWarehouse
);

// Update warehouse
router.put(
  "/:id",
  restrictTo("ADMIN"),
  configController.updateWarehouse
);

// Delete warehouse
router.delete(
  "/:id",
  restrictTo("ADMIN"),
  configController.deleteWarehouse
);

// ============================================
// WAREHOUSE OPERATIONS
// ============================================

// Generate locations from configuration
router.post(
  "/:id/generate-locations",
  restrictTo("ADMIN"),
  configController.generateLocationsFromConfig
);

// Get warehouse statistics
router.get(
  "/:id/stats",
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  configController.getWarehouseStats
);

export default router;
