// ============================================
// FILE: backend/src/modules/product/universalProductRoutes.js
// ============================================

import express from "express";
import controller from "./universalProductController.js";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", controller.findAll);

// Protected routes
router.use(protect);
router.use(restrictTo("ADMIN", "WAREHOUSE_STAFF"));

router.post("/", controller.create);
router.get("/:id/variants", controller.getVariants);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteProduct);

// Dynamic route handler (ObjectId or slug)
const routeHandler = (req, res, next) => {
  const { id } = req.params;

  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return controller.findOne(req, res, next);
  }
  return controller.getProductDetail(req, res, next);
};

router.get("/:id", routeHandler);

export default router;
