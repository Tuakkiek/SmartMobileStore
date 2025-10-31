// backend/src/routes/iPhoneRoutes.js
import express from "express";
import * as controller from "../controllers/iPhoneController.js";

const router = express.Router();

// ✅ Static routes first
router.post("/", controller.create);
router.get("/", controller.findAll);

// ✅ Product detail route (MUST be before /:id)
// Matches: /iphones/iphone-17-pro (base, default 256GB + default color)
//          /iphones/iphone-17-pro-512gb (append storage, default color)
//          /iphones/iphone-17-pro-256gb?sku=00000001 (append storage + ?sku for non-default color)
const response = await axios.get(`/iphones/${slug}`, { params: { sku } });



// ✅ ID-specific routes
router.get("/:id/variants", controller.getVariants);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPhone);

export default router;
