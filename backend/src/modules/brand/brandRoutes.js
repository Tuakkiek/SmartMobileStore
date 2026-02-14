// ============================================
// FILE: backend/src/modules/brand/brandRoutes.js
// ============================================

import express from "express";
import controller from "./brandController.js";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("ADMIN", "PRODUCT_MANAGER", "WAREHOUSE_MANAGER"));

router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteBrand);

export default router;
