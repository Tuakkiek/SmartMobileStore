import express from "express";
import { getRelatedProducts } from "./recommendationController.js";

const router = express.Router();

// GET /api/products/:id/related -> now likely mounted at /api/recommendations/:id/related or similar
// If we want to preserve /api/products/:id/related, we mount this router at /api/products in server.js

router.get("/:id/related", getRelatedProducts);

export default router;
