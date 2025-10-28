// backend/src/routes/iPhoneRoutes.js
import express from "express";
import * as controller from "../controllers/iPhoneController.js";

const router = express.Router();

// ✅ Static routes first
router.post("/", controller.create);
router.get("/", controller.findAll);

// ✅ Product detail route (MUST be before /:id)
// Matches: /iphones/iphone-16-pro-256gb?sku=00911089
router.get("/:modelSlug-:storage", controller.getProductDetail);

// ✅ ID-specific routes
router.get("/:id/variants", controller.getVariants);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPhone);

export default router;
