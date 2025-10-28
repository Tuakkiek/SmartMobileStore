// backend/src/routes/appleWatchRoutes.js
import express from "express";
import * as controller from "../controllers/appleWatchController.js";

const router = express.Router();

// POST route to create a new Apple Watch
router.post("/", controller.create);

// GET route to fetch all Apple Watches
router.get("/", controller.findAll);

// GET route to fetch a single Apple Watch by its ID
router.get("/:id", controller.findOne);

// PUT route to update an Apple Watch by its ID
router.put("/:id", controller.update);

// DELETE route to remove an Apple Watch by its ID
router.delete("/:id", controller.deleteAppleWatch);

// GET route to fetch all variants for a specific Apple Watch by its ID
router.get("/:id/variants", controller.getVariants);

// New: for product detail URL (adapted for variantName)
router.get("/:modelSlug-:variantName", controller.getProductDetail);

export default router;
