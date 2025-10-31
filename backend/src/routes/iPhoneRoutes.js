// ============================================
// FILE: backend/src/routes/iPhoneRoutes.js
// ✅ FIXED: Proper route ordering without regex
// ============================================

import express from "express";
import * as controller from "../controllers/iPhoneController.js";

const router = express.Router();

// ============================================
// STATIC ROUTES FIRST
// ============================================
router.post("/", controller.create);
router.get("/", controller.findAll);

// ============================================
// SPECIFIC ID ROUTES (với pattern đặc biệt)
// ============================================
// Các route này phải đặt trước dynamic slug route
router.get("/:id/variants", controller.getVariants);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPhone);

// ============================================
// ✅ DYNAMIC ROUTES (phải đặt cuối)
// ============================================

// Middleware để phân biệt ObjectId vs Slug
const isObjectId = (req, res, next) => {
  const { id } = req.params;
  // MongoDB ObjectId có 24 ký tự hex
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(); // Đây là ObjectId, tiếp tục
  }
  // Không phải ObjectId, chuyển sang getProductDetail
  return controller.getProductDetail(req, res, next);
};

// Route này sẽ match cả ObjectId và slug
// Middleware isObjectId sẽ quyết định gọi hàm nào
router.get("/:id", isObjectId, controller.findOne);

export default router;