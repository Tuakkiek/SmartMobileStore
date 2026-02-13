import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  getAllStores,
  getNearbyStores,
  getStoreById,
  checkStoreStock,
} from "./storeController.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllStores);
router.get("/nearby", getNearbyStores);
router.get("/:id", getStoreById);
router.post("/:storeId/check-stock", checkStoreStock);

export default router;
