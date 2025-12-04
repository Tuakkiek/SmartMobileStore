// ============================================
// FILE: backend/src/controllers/shortVideoController.js
// Controller for short videos management
// ============================================

import ShortVideo from "../models/ShortVideo.js";
import path from "path";
import fs from "fs";

// ============================================
// PUBLIC: GET PUBLISHED VIDEOS
// ============================================
export const getPublishedVideos = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const videos = await ShortVideo.getPublished(
      parseInt(limit),
      parseInt(skip)
    );

    const total = await ShortVideo.countDocuments({ status: "PUBLISHED" });

    res.json({
      success: true,
      data: {
        videos,
        total,
        hasMore: parseInt(skip) + videos.length < total,
      },
    });
  } catch (error) {
    console.error("getPublishedVideos error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// PUBLIC: GET TRENDING VIDEOS
// ============================================
export const getTrendingVideos = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const videos = await ShortVideo.getTrending(parseInt(limit));

    res.json({
      success: true,
      data: { videos },
    });
  } catch (error) {
    console.error("getTrendingVideos error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// PUBLIC: GET VIDEO BY ID
// ============================================
export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await ShortVideo.findById(id)
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts.productId");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      data: { video },
    });
  } catch (error) {
    console.error("getVideoById error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// PUBLIC: INCREMENT VIEW
// ============================================
export const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await ShortVideo.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    await video.incrementViews();

    res.json({
      success: true,
      message: "View count updated",
      data: { views: video.views },
    });
  } catch (error) {
    console.error("incrementView error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// USER: TOGGLE LIKE
// ============================================
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const video = await ShortVideo.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    await video.toggleLike(userId);

    const isLiked = video.likedBy.includes(userId);

    res.json({
      success: true,
      message: isLiked ? "Đã thích video" : "Đã bỏ thích",
      data: {
        likes: video.likes,
        isLiked,
      },
    });
  } catch (error) {
    console.error("toggleLike error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// PUBLIC: INCREMENT SHARE
// ============================================
export const incrementShare = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await ShortVideo.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    await video.incrementShares();

    res.json({
      success: true,
      message: "Share count updated",
      data: { shares: video.shares },
    });
  } catch (error) {
    console.error("incrementShare error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ADMIN: GET ALL VIDEOS
// ============================================
export const getAllVideos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "publishedAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const videos = await ShortVideo.find(query)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("createdBy", "fullName avatar email");

    const total = await ShortVideo.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getAllVideos error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ADMIN: CREATE VIDEO
// ============================================
export const createVideo = async (req, res) => {
  try {
    const videoData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const video = await ShortVideo.create(videoData);

    res.status(201).json({
      success: true,
      message: "Tạo video thành công",
      data: { video },
    });
  } catch (error) {
    console.error("createVideo error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ADMIN: UPDATE VIDEO
// ============================================
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const video = await ShortVideo.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật video thành công",
      data: { video },
    });
  } catch (error) {
    console.error("updateVideo error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ADMIN: DELETE VIDEO
// ============================================
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await ShortVideo.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    // Delete video file if stored locally
    if (video.videoUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), video.videoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete thumbnail if stored locally
    if (video.thumbnailUrl?.startsWith("/uploads/")) {
      const thumbPath = path.join(process.cwd(), video.thumbnailUrl);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    await video.deleteOne();

    res.json({
      success: true,
      message: "Xóa video thành công",
    });
  } catch (error) {
    console.error("deleteVideo error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ADMIN: REORDER VIDEOS
// ============================================
export const reorderVideos = async (req, res) => {
  try {
    const { videoIds } = req.body; // Array of video IDs in new order

    if (!Array.isArray(videoIds)) {
      return res.status(400).json({
        success: false,
        message: "videoIds phải là một mảng",
      });
    }

    // Update order for each video
    await Promise.all(
      videoIds.map((id, index) =>
        ShortVideo.findByIdAndUpdate(id, { order: index })
      )
    );

    res.json({
      success: true,
      message: "Đã cập nhật thứ tự video",
    });
  } catch (error) {
    console.error("reorderVideos error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
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
};
