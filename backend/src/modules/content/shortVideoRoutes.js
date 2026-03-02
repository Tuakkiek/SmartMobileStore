// ============================================
// FILE: backend/src/routes/shortVideoRoutes.js
// ✅ UPDATED: Using Cloudinary for video/thumbnail storage
// ============================================

import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import {
  getAllVideos,
  getPublishedVideos,
  getTrendingVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  incrementView,
  toggleLike,
  incrementShare,
  reorderVideos,
} from "./shortVideoController.js";

const router = express.Router();

// ============================================
// MULTER CONFIGURATION – Memory Storage only
// Files are uploaded to Cloudinary server-side
// ============================================

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    const allowedVideoTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-flv",
      "video/webm",
    ];

    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Chỉ chấp nhận file video (MP4, MOV, AVI, FLV, WebM)!"),
        false
      );
    }
  } else if (file.fieldname === "thumbnail") {
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WebP)!"), false);
    }
  } else {
    cb(new Error("Invalid field name"), false);
  }
};

// Use memoryStorage so files stay in RAM buffer → sent to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB to allow large video files
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn! Video tối đa 200MB, ảnh tối đa 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Lỗi khi upload file",
    });
  }
  next();
};

// ============================================
// PUBLIC ROUTES
// ============================================

router.get("/published", getPublishedVideos);
router.get("/trending", getTrendingVideos);
router.get("/:id", getVideoById);
router.post("/:id/view", incrementView);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/share", incrementShare);

// ============================================
// ADMIN ROUTES
// ============================================

router.get("/", protect, restrictTo("ADMIN"), getAllVideos);

router.post(
  "/",
  protect,
  restrictTo("ADMIN"),
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  createVideo
);

router.put(
  "/:id",
  protect,
  restrictTo("ADMIN"),
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  updateVideo
);

router.delete("/:id", protect, restrictTo("ADMIN"), deleteVideo);

router.put("/reorder", protect, restrictTo("ADMIN"), reorderVideos);

export default router;
