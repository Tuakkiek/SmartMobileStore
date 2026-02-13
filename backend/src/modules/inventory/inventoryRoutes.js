import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { checkAvailability, getByStore } from "./inventoryController.js";

const router = express.Router();

router.use(protect);

router.get("/check/:productId/:variantSku", checkAvailability);
router.get("/store/:storeId", getByStore);

export default router;
