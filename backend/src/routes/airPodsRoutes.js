// backend/src/routes/airPodsRoutes.js
import express from "express";
import * as controller from "../controllers/airPodsController.js";

const router = express.Router();

// Create a new AirPods (with variants)
router.post("/", controller.create);

// Get all AirPods
router.get("/", controller.findAll);

// Get AirPods by ID
router.get("/:id", controller.findOne);

// Update AirPods by ID
router.put("/:id", controller.update);

// Delete AirPods by ID
router.delete("/:id", controller.deleteAirPods);

// Get variants of a specific AirPods by its ID
router.get("/:id/variants", controller.getVariants);

// New: for product detail URL (adapted for variantName)
router.get("/:modelSlug-:variantName", controller.getProductDetail);

export default router;
