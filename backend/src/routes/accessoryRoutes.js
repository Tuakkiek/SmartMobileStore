// backend/src/routes/accessoryRoutes.js
import express from "express";
import * as controller from "../controllers/accessoryController.js";

const router = express.Router();

// Create a new accessory (with variants)
router.post("/", controller.create);

// Get all accessories
router.get("/", controller.findAll);

// Get accessory by ID
router.get("/:id", controller.findOne);

// Update accessory by ID
router.put("/:id", controller.update);

// Delete accessory by ID
router.delete("/:id", controller.deleteAccessory);

// Get variants of a specific accessory by its ID
router.get("/:id/variants", controller.getVariants);

// New: for product detail URL (adapted for variantName)
router.get("/:modelSlug-:variantName", controller.getProductDetail);

export default router;
