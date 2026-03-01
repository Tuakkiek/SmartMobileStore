import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import {
  getAllStores,
  getNearbyStores,
  getStoreById,
  checkStoreStock,
  createStore,
  updateStore,
  deleteStore,
} from "./storeController.js";
import { restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllStores);
router.get("/nearby", getNearbyStores);
router.get("/:id", getStoreById);
router.post("/:storeId/check-stock", checkStoreStock);

// Admin only routes — resolveAccessContext must come after restrictTo so that
// BranchContext (scopeMode="global" for GLOBAL_ADMIN) is available to
// branchIsolationPlugin when the controller queries branch-scoped models.
router.post("/", restrictTo("ADMIN", "GLOBAL_ADMIN"), resolveAccessContext, createStore);
router.put("/:id", restrictTo("ADMIN", "GLOBAL_ADMIN"), resolveAccessContext, updateStore);
router.delete("/:id", restrictTo("ADMIN", "GLOBAL_ADMIN"), resolveAccessContext, deleteStore);

export default router;
