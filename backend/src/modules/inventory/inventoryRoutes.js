import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import {
  checkAvailability,
  getByStore,
  getConsolidatedInventory,
  getStoreInventoryComparison,
  getLowStockAlerts,
  getReplenishmentRecommendations,
  runReplenishmentSnapshotNow,
  getDemandPredictions,
  getSkuDemandPrediction,
  getRecentStockMovements,
} from "./inventoryController.js";
import {
  requestTransfer,
  getTransfers,
  getTransferById,
  approveTransfer,
  rejectTransfer,
  shipTransfer,
  receiveTransfer,
  completeTransfer,
  cancelTransfer,
} from "./transferController.js";

const router = express.Router();

router.use(protect);

router.get("/check/:productId/:variantSku", checkAvailability);
router.get("/store/:storeId", getByStore);

router.get(
  "/dashboard/consolidated",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getConsolidatedInventory
);
router.get(
  "/dashboard/store-comparison",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getStoreInventoryComparison
);
router.get(
  "/dashboard/alerts",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getLowStockAlerts
);
router.get(
  "/dashboard/replenishment",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getReplenishmentRecommendations
);
router.post(
  "/dashboard/replenishment/run-snapshot",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER"),
  runReplenishmentSnapshotNow
);
router.get(
  "/dashboard/predictions",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getDemandPredictions
);
router.get(
  "/dashboard/predictions/:variantSku",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getSkuDemandPrediction
);
router.get(
  "/dashboard/movements",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getRecentStockMovements
);

router.get(
  "/transfers",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getTransfers
);
router.get(
  "/transfers/:id",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  getTransferById
);
router.post(
  "/transfers/request",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "ORDER_MANAGER"),
  requestTransfer
);
router.put(
  "/transfers/:id/approve",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER"),
  approveTransfer
);
router.put(
  "/transfers/:id/reject",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER"),
  rejectTransfer
);
router.put(
  "/transfers/:id/ship",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  shipTransfer
);
router.put(
  "/transfers/:id/receive",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"),
  receiveTransfer
);
router.put(
  "/transfers/:id/complete",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER"),
  completeTransfer
);
router.put(
  "/transfers/:id/cancel",
  restrictTo("ADMIN", "WAREHOUSE_MANAGER"),
  cancelTransfer
);

export default router;
