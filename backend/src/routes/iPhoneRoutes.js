// ============================================
// FILE: backend/src/routes/iPhoneRoutes.js
// ✅ FIXED: Support variant slug routing
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
// SPECIFIC ID ROUTES
// ============================================
router.get("/:id/variants", controller.getVariants);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPhone);

// ============================================
// ✅ DYNAMIC ROUTES (phải đặt cuối)
// ============================================

// Middleware để phân biệt ObjectId vs Slug
const routeHandler = (req, res, next) => {
  const { id } = req.params;

  console.log("🔍 Route handler received:", { id, query: req.query });

  // MongoDB ObjectId có 24 ký tự hex
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    console.log("✅ Detected ObjectId, calling findOne");
    return controller.findOne(req, res, next);
  }

  // Không phải ObjectId → là slug (có thể chứa storage)
  console.log("✅ Detected slug, calling getProductDetail");
  return controller.getProductDetail(req, res, next);
};

// Route này match cả ObjectId và slug
router.get("/:id", routeHandler);

export default router;
