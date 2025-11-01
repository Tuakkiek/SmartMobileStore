// backend/src/routes/iPadRoutes.js
import express from "express";
import controller from "../controllers/iPadController.js";
console.log("controller keys:", Object.keys(controller));
const router = express.Router();

router.post("/", controller.create);
router.get("/", controller.findAll);

router.get("/:id/variants", controller.getVariants);
router.put("/:id", controller.update);
router.delete("/:id", controller.deleteIPad);

const routeHandler = (req, res, next) => {
  const { id } = req.params;

  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return controller.findOne(req, res, next);
  }
  return controller.getProductDetail(req, res, next);
};

router.get("/:id", routeHandler);

export default router;
