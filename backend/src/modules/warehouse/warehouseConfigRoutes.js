import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";
import * as configController from "./warehouseConfigController.js";
import {
  requireGlobalSimulationForWarehouseWrite,
  resolveWarehouseScopeMode,
} from "./warehouseContext.js";

const router = express.Router();

const requireWarehouseConfigRead = authorize(AUTHZ_ACTIONS.WAREHOUSE_READ, {
  scopeMode: resolveWarehouseScopeMode,
  requireActiveBranchFor: ["branch"],
  resourceType: "WAREHOUSE_CONFIG",
});

const requireWarehouseConfigWrite = authorize(AUTHZ_ACTIONS.WAREHOUSE_WRITE, {
  scopeMode: "branch",
  requireActiveBranch: true,
  resourceType: "WAREHOUSE_CONFIG",
});

router.use(protect, resolveAccessContext);

router.get("/", requireWarehouseConfigRead, configController.getAllWarehouses);

router.get("/:id", requireWarehouseConfigRead, configController.getWarehouseById);

router.post(
  "/",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseConfigWrite,
  configController.createWarehouse
);

router.put(
  "/:id",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseConfigWrite,
  configController.updateWarehouse
);

router.delete(
  "/:id",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseConfigWrite,
  configController.deleteWarehouse
);

router.post(
  "/:id/generate-locations",
  requireGlobalSimulationForWarehouseWrite,
  requireWarehouseConfigWrite,
  configController.generateLocationsFromConfig
);

router.get("/:id/stats", requireWarehouseConfigRead, configController.getWarehouseStats);

router.get("/:id/layout", requireWarehouseConfigRead, configController.getWarehouseLayout);

router.get(
  "/:id/search-location",
  requireWarehouseConfigRead,
  configController.searchLocationByProduct
);

export default router;
