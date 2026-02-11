// ============================================
// FILE: backend/src/modules/productType/productTypeRoutes.js
// ============================================

import express from "express";
import controller from "./productTypeController.js";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("ADMIN", "WAREHOUSE_STAFF"));

router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteProductType);

export default router;
