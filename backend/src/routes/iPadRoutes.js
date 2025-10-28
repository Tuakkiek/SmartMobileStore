// backend/src/routes/iPadRoutes.js
import express from "express";
import * as controller from "../controllers/iPadController.js";

const router = express.Router();

router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPad);
router.get("/:id/variants", controller.getVariants);
router.get("/:modelSlug-:storage", controller.getProductDetail); // New: for product detail URL

export default router;
