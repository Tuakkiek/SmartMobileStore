// backend/src/routes/macRoutes.js
import express from "express";
import * as controller from "../controllers/macController.js"; // Đảm bảo tên file controller đúng

const router = express.Router();

// Route để tạo mới Mac
router.post("/", controller.create);

// Route để lấy tất cả các Mac
router.get("/", controller.findAll);

// Route để lấy thông tin chi tiết một Mac theo ID
router.get("/:id", controller.findOne);

// Route để cập nhật thông tin của một Mac theo ID
router.put("/:id", controller.update);

// Route để xóa một Mac theo ID
router.delete("/:id", controller.deleteMac);

// Route để lấy tất cả các variants của một Mac
router.get("/:id/variants", controller.getVariants);

// New: for product detail URL
router.get("/:modelSlug-:storage", controller.getProductDetail);

export default router;
