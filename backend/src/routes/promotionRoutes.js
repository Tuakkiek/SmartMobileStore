// routes/promotionRoutes.js
import express from "express";
import {
  getActivePromotions,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  applyPromotion,
  getPromotionUsageHistory,
  getMyPromotionUsage,
} from "../controllers/promotionController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================
   PUBLIC ROUTES
   ============================================ */
// GET /api/promotions/active
// → Ai cũng xem được danh sách mã đang hoạt động
router.get("/active", getActivePromotions);

/* ============================================
   CUSTOMER ROUTES (Yêu cầu đăng nhập)
   ============================================ */
// POST /api/promotions/apply
// → Người dùng áp dụng mã khuyến mãi
// → Middleware: protect (đã đăng nhập)
router.post("/apply", protect, applyPromotion);

// GET /api/promotions/my-usage
// → Xem lịch sử mã khuyến mãi đã dùng
// → Middleware: protect
router.get("/my-usage", protect, getMyPromotionUsage);

/* ============================================
   ADMIN ROUTES (Yêu cầu ADMIN)
   → Tất cả route phía dưới đều áp dụng:
   - protect: phải đăng nhập
   - restrictTo("ADMIN"): chỉ ADMIN
   ============================================ */
router.use(protect, restrictTo("ADMIN"));

// GET    /api/promotions          → Danh sách tất cả mã
// POST   /api/promotions          → Tạo mã mới
// PUT    /api/promotions/:id      → Cập nhật mã
// DELETE /api/promotions/:id      → Xóa mã
router.get("/", getAllPromotions);
router.post("/", createPromotion);
router.put("/:id", updatePromotion);
router.delete("/:id", deletePromotion);

// GET /api/promotions/:id/usage
// → Xem chi tiết ai đã dùng mã này (lịch sử)
router.get("/:id/usage", getPromotionUsageHistory);

export default router;
