// ============================================
// FILE: backend/src/routes/cartRoutes.js
// ============================================
import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import {
  getCart,
  getCartCount,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
} from "./cartController.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("CUSTOMER"));

router.get("/count", getCartCount);
router.get("/", getCart);
router.post("/", addToCart);
router.put("/", updateCartItem);
router.delete("/:itemId", removeFromCart);
router.delete("/", clearCart);
router.post("/validate", validateCart);

export default router;
