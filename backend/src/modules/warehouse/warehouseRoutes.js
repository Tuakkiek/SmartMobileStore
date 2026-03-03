import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import * as warehouseController from "./warehouseController.js";
import * as goodsReceiptController from "./goodsReceiptController.js";
import * as stockOperationsController from "./stockOperationsController.js";
import * as stockInController from "./stockInController.js";
import {
  requireGlobalSimulationForWarehouseWrite,
  resolveWarehouseScopeMode,
} from "./warehouseContext.js";

const router = express.Router();

const requireWarehouseRead = authorize(AUTHZ_ACTIONS.WAREHOUSE_READ, {
  scopeMode: resolveWarehouseScopeMode,
  requireActiveBranchFor: ["branch"],
  resourceType: "WAREHOUSE",
});

const requireWarehouseWrite = authorize(AUTHZ_ACTIONS.WAREHOUSE_WRITE, {
  scopeMode: "branch",
  requireActiveBranch: true,
  resourceType: "WAREHOUSE",
});

router.use(protect, resolveAccessContext);

router.post(
  "/stock-in",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockInController.directStockIn
);

router.get(
  "/stock-in/history",
  requireWarehouseRead,
  stockInController.getStockInHistory
);

router.post(
  "/locations/generate",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  warehouseController.generateWarehouseStructure
);

router.get("/locations", requireWarehouseRead, warehouseController.getAllLocations);

router.get(
  "/locations/:locationCode",
  requireWarehouseRead,
  warehouseController.getLocationDetail
);

router.post(
  "/locations/suggest",
  requireWarehouseRead,
  warehouseController.suggestLocation
);

router.get(
  "/inventory/search",
  requireWarehouseRead,
  warehouseController.searchInventory
);

router.post(
  "/purchase-orders",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  warehouseController.createPurchaseOrder
);

router.get(
  "/purchase-orders",
  requireWarehouseRead,
  warehouseController.getPurchaseOrders
);

router.get(
  "/purchase-orders/:id",
  requireWarehouseRead,
  warehouseController.getPurchaseOrderDetail
);

router.put(
  "/purchase-orders/:id/approve",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  warehouseController.approvePurchaseOrder
);

router.post(
  "/goods-receipt/start",
  requireWarehouseRead,
  goodsReceiptController.startGoodsReceipt
);

router.post(
  "/goods-receipt/receive-item",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  goodsReceiptController.receiveItem
);

router.post(
  "/goods-receipt/complete",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  goodsReceiptController.completeGoodsReceipt
);

router.get(
  "/goods-receipt",
  requireWarehouseRead,
  goodsReceiptController.getGoodsReceipts
);

router.get(
  "/pick-list/:orderId",
  requireWarehouseRead,
  stockOperationsController.getPickList
);

router.post(
  "/pick",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockOperationsController.pickItem
);

router.post(
  "/transfer",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockOperationsController.transferStock
);

router.post(
  "/cycle-count",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockOperationsController.createCycleCount
);

router.get(
  "/cycle-count",
  requireWarehouseRead,
  stockOperationsController.getCycleCounts
);

router.put(
  "/cycle-count/:id/update-item",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockOperationsController.updateCycleCountItem
);

router.put(
  "/cycle-count/:id/complete",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockOperationsController.completeCycleCount
);

router.put(
  "/cycle-count/:id/approve",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseWrite,
  stockOperationsController.approveCycleCount
);

export default router;
