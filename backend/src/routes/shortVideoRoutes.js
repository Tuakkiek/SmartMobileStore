// ============================================
// FILE: backend/src/routes/shortVideoRoutes.js
// Routes for short videos
// ============================================

import express from "express";
import {
  getPublishedVideos,
  getTrendingVideos,
  getVideoById,
  incrementView,
  toggleLike,
  incrementShare,
  getAllVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  reorderVideos,
} from "../controllers/shortVideoController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
router.get("/published", getPublishedVideos);
router.get("/trending", getTrendingVideos);
router.get("/:id", getVideoById);
router.post("/:id/view", incrementView);
router.post("/:id/share", incrementShare);

// ============================================
// AUTHENTICATED USER ROUTES
// ============================================
router.post("/:id/like", protect, toggleLike);

// ============================================
// ADMIN ROUTES
// ============================================
router.use(protect);
router.use(restrictTo("ADMIN", "WAREHOUSE_STAFF"));

router.get("/", getAllVideos);
router.post("/", createVideo);
router.put("/:id", updateVideo);
router.delete("/:id", deleteVideo);
router.put("/reorder", reorderVideos);

export default router;
