import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
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

// Admin only routes
router.post("/", restrictTo("ADMIN"), createStore);
router.put("/:id", restrictTo("ADMIN"), updateStore);
router.delete("/:id", restrictTo("ADMIN"), deleteStore);

export default router;
