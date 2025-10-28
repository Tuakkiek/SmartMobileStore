// backend/src/routes/iPhoneRoutes.js
import express from "express";
import * as controller from "../controllers/iPhoneController.js"; // Sử dụng import tất cả các controller

const router = express.Router();

// Đảm bảo controller là hàm hợp lệ
router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPhone);
router.get("/:id/variants", controller.getVariants);
router.get("/sku/:sku", controller.findOneBySku); // Optional: add if needed
router.get("/:modelSlug-:storage", controller.getProductDetail); // New: for product detail URL

export default router;
