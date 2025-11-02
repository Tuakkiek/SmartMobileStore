// routes/promotionRoutes.js
import express from "express";
import {
  getActivePromotions,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  applyPromotion,

} from "../controllers/promotionController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/active", getActivePromotions);


router.post("/apply", protect, applyPromotion);



router.use(protect, restrictTo("ADMIN"));

router.get("/", getAllPromotions);
router.post("/", createPromotion);
router.put("/:id", updatePromotion);
router.delete("/:id", deletePromotion);




export default router;
