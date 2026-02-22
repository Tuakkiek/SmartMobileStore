// ============================================
// FILE: backend/src/modules/product/universalProductRoutes.js
// KILL-SWITCH: restrictTo → authorize
// ============================================

import express from "express";
import controller from "./universalProductController.js";
import { protect } from "../../middleware/authMiddleware.js";
import { resolveAccessContext } from "../../middleware/authz/resolveAccessContext.js";
import { authorize } from "../../middleware/authz/authorize.js";
import { AUTHZ_ACTIONS } from "../../authz/actions.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/", controller.findAll);
router.get("/:id", (req, res, next) => {
  const { id } = req.params;
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return controller.findOne(req, res, next);
  }
  return controller.getProductDetail(req, res, next);
});

// Protected routes — V2 Authz
router.use(protect, resolveAccessContext);

router.post(
  "/",
  authorize(AUTHZ_ACTIONS.PRODUCT_CREATE, {
    scopeMode: "branch",
    requireActiveBranch: true,
    resourceType: "PRODUCT",
  }),
  controller.create
);

router.get(
  "/:id/variants",
  authorize(AUTHZ_ACTIONS.PRODUCT_READ, {
    scopeMode: "branch",
    resourceType: "PRODUCT",
  }),
  controller.getVariants
);

router.put(
  "/:id",
  authorize(AUTHZ_ACTIONS.PRODUCT_UPDATE, {
    scopeMode: "branch",
    requireActiveBranch: true,
    resourceType: "PRODUCT",
  }),
  controller.update
);

router.delete(
  "/:id",
  authorize(AUTHZ_ACTIONS.PRODUCT_DELETE, {
    scopeMode: "branch",
    requireActiveBranch: true,
    resourceType: "PRODUCT",
  }),
  controller.deleteProduct
);

export default router;
