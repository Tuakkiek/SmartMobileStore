// backend/src/routes/macRoutes.js
import express from "express";
import controller from "./macController.js";

const router = express.Router();

// STATIC ROUTES
router.post("/", controller.createMac);     // ← dùng createMac
router.get("/", controller.findAllMac);     // ← dùng findAllMac

// SPECIFIC ROUTES
router.get("/:id/variants", controller.getVariantsMac);  // ← getVariantsMac
router.put("/:id", controller.updateMac);                // ← updateMac
router.delete("/:id", controller.deleteMac);             // ← deleteMac

// DYNAMIC ROUTE: ObjectId or slug (macbook-pro-m3-silver-512gb)
const routeHandler = (req, res, next) => {
  const { id } = req.params;

  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return controller.findOneMac(req, res, next);  // ← findOneMac
  }
  return controller.getProductDetailMac(req, res, next); // ← getProductDetailMac
};

router.get("/:id", routeHandler);

export default router;