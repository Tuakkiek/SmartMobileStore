// ============================================
// FILE: backend/src/modules/content/shortVideoController.js
// ✅ UPDATED: Upload video/thumbnail to Cloudinary
// ============================================

import ShortVideo from "./ShortVideo.js";
import cloudinary from "../../lib/cloudinary.js";

// ============================================
// HELPER: Upload buffer to Cloudinary
// ============================================
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: "auto",
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

// ============================================
// HELPER: Delete from Cloudinary by public_id
// ============================================
const deleteFromCloudinary = async (publicId, resourceType = "video") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(`🗑️ Deleted Cloudinary asset: ${publicId}`);
  } catch (err) {
    console.error(`⚠️ Failed to delete Cloudinary asset ${publicId}:`, err);
  }
};

// ============================================
// GET ALL VIDEOS (Admin only - with pagination)
// ============================================
export const getAllVideos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = "-createdAt",
    } = req.query;

    const query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const videos = await ShortVideo.find(query)
      .populate("createdBy", "fullName avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ShortVideo.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách video",
    });
  }
};

// ============================================
// GET PUBLISHED VIDEOS (Public)
// ============================================
export const getPublishedVideos = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const videos = await ShortVideo.find({ status: "PUBLISHED" })
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts")
      .sort({ order: 1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { videos },
    });
  } catch (error) {
    console.error("Get published videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy video",
    });
  }
};

// ============================================
// GET TRENDING VIDEOS (Public)
// ============================================
export const getTrendingVideos = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const videos = await ShortVideo.find({ status: "PUBLISHED" })
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts")
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { videos },
    });
  } catch (error) {
    console.error("Get trending videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy video trending",
    });
  }
};

// ============================================
// GET VIDEO BY ID (Public)
// ============================================
export const getVideoById = async (req, res) => {
  try {
    const video = await ShortVideo.findById(req.params.id)
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts");

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
    console.error("Get video by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy video",
    });
  }
};

// ============================================
// CREATE VIDEO (Admin only)
// ============================================
export const createVideo = async (req, res) => {
  try {
    console.log("📥 Create video request received");
    console.log("- Body:", req.body);

    const { title, description, status, linkedProducts } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề không được để trống",
      });
    }

    if (!req.files) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file",
      });
    }

    if (!req.files.video) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file video",
      });
    }

    if (!req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload ảnh thumbnail",
      });
    }

    const videoBuffer = req.files.video[0].buffer;
    const thumbnailBuffer = req.files.thumbnail[0].buffer;

    console.log("☁️  Uploading video to Cloudinary...");

    // Upload video to Cloudinary (no preset needed – server-side signed upload)
    const videoUploadResult = await uploadBufferToCloudinary(videoBuffer, {
      resource_type: "video",
      folder: "short-videos/videos",
    });

    console.log("✅ Video uploaded:", videoUploadResult.secure_url);
    console.log("☁️  Uploading thumbnail to Cloudinary...");

    // Upload thumbnail to Cloudinary
    const thumbnailUploadResult = await uploadBufferToCloudinary(
      thumbnailBuffer,
      {
        resource_type: "image",
        folder: "short-videos/thumbnails",
      }
    );

    console.log("✅ Thumbnail uploaded:", thumbnailUploadResult.secure_url);

    // Find max order
    const maxOrderVideo = await ShortVideo.findOne().sort({ order: -1 });
    const order = maxOrderVideo ? maxOrderVideo.order + 1 : 1;

    // Parse linkedProducts
    let parsedLinkedProducts = [];
    if (linkedProducts) {
      try {
        parsedLinkedProducts =
          typeof linkedProducts === "string"
            ? JSON.parse(linkedProducts)
            : linkedProducts;
      } catch (e) {
        console.warn("Could not parse linkedProducts:", e);
      }
    }

    // Get video duration from Cloudinary result
    const duration = videoUploadResult.duration
      ? Math.round(videoUploadResult.duration)
      : 60;

    // Create video document
    const video = new ShortVideo({
      title: title.trim(),
      description: description?.trim() || "",
      videoUrl: videoUploadResult.secure_url,
      videoPublicId: videoUploadResult.public_id,
      thumbnailUrl: thumbnailUploadResult.secure_url,
      thumbnailPublicId: thumbnailUploadResult.public_id,
      duration,
      status: status || "DRAFT",
      createdBy: userId,
      order,
      linkedProducts: parsedLinkedProducts,
    });

    await video.save();
    await video.populate("createdBy", "fullName avatar");

    console.log("✅ Video created successfully:", video._id);

    res.status(201).json({
      success: true,
      message: "Video đã được tạo thành công",
      data: { video },
    });
  } catch (error) {
    console.error("❌ Create video error:", error);
    // Log Cloudinary-specific details if available
    if (error.http_code || error.name === "Error") {
      console.error("   Cloudinary error details:", {
        http_code: error.http_code,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tạo video",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

// ============================================
// UPDATE VIDEO (Admin only)
// ============================================
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, linkedProducts } = req.body;

    const video = await ShortVideo.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    // Update text fields
    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (status) video.status = status;
    if (linkedProducts) {
      video.linkedProducts =
        typeof linkedProducts === "string"
          ? JSON.parse(linkedProducts)
          : linkedProducts;
    }

    // Update video file if provided
    if (req.files && req.files.video) {
      console.log("☁️ Replacing video on Cloudinary...");

      // Delete old video from Cloudinary
      await deleteFromCloudinary(video.videoPublicId, "video");

      // Upload new video (server-side signed upload, no preset needed)
      const videoUploadResult = await uploadBufferToCloudinary(
        req.files.video[0].buffer,
        {
          resource_type: "video",
          folder: "short-videos/videos",
        }
      );

      video.videoUrl = videoUploadResult.secure_url;
      video.videoPublicId = videoUploadResult.public_id;

      if (videoUploadResult.duration) {
        video.duration = Math.round(videoUploadResult.duration);
      }

      console.log("✅ Video replaced:", videoUploadResult.secure_url);
    }

    // Update thumbnail if provided
    if (req.files && req.files.thumbnail) {
      console.log("☁️ Replacing thumbnail on Cloudinary...");

      // Delete old thumbnail from Cloudinary
      await deleteFromCloudinary(video.thumbnailPublicId, "image");

      // Upload new thumbnail
      const thumbnailUploadResult = await uploadBufferToCloudinary(
        req.files.thumbnail[0].buffer,
        {
          resource_type: "image",
          folder: "short-videos/thumbnails",
        }
      );

      video.thumbnailUrl = thumbnailUploadResult.secure_url;
      video.thumbnailPublicId = thumbnailUploadResult.public_id;

      console.log("✅ Thumbnail replaced:", thumbnailUploadResult.secure_url);
    }

    // Update publishedAt if status changes to PUBLISHED
    if (status === "PUBLISHED" && video.status !== "PUBLISHED") {
      video.publishedAt = new Date();
    }

    await video.save();
    await video.populate("createdBy", "fullName avatar");

    res.json({
      success: true,
      message: "Video đã được cập nhật",
      data: { video },
    });
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật video",
    });
  }
};

// ============================================
// DELETE VIDEO (Admin only)
// ============================================
export const deleteVideo = async (req, res) => {
  try {
    const video = await ShortVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    // Delete video and thumbnail from Cloudinary
    await Promise.all([
      deleteFromCloudinary(video.videoPublicId, "video"),
      deleteFromCloudinary(video.thumbnailPublicId, "image"),
    ]);

    await video.deleteOne();

    res.json({
      success: true,
      message: "Video đã được xóa",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa video",
    });
  }
};

// ============================================
// INCREMENT VIEW COUNT (Public)
// ============================================
export const incrementView = async (req, res) => {
  try {
    const video = await ShortVideo.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      data: { views: video.views },
    });
  } catch (error) {
    console.error("Increment view error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lượt xem",
    });
  }
};

// ============================================
// TOGGLE LIKE (Requires authentication)
// ============================================
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const videoId = req.params.id;

    const video = await ShortVideo.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    const hasLiked = video.likedBy.includes(userId);

    if (hasLiked) {
      video.likedBy = video.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      video.likes = Math.max(0, video.likes - 1);
    } else {
      video.likedBy.push(userId);
      video.likes += 1;
    }

    await video.save();

    res.json({
      success: true,
      data: {
        likes: video.likes,
        isLiked: !hasLiked,
      },
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi toggle like",
    });
  }
};

// ============================================
// INCREMENT SHARE COUNT (Public)
// ============================================
export const incrementShare = async (req, res) => {
  try {
    const video = await ShortVideo.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      data: { shares: video.shares },
    });
  } catch (error) {
    console.error("Increment share error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lượt chia sẻ",
    });
  }
};

// ============================================
// REORDER VIDEOS (Admin only)
// ============================================
export const reorderVideos = async (req, res) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách video không hợp lệ",
      });
    }

    const updatePromises = videoIds.map((id, index) =>
      ShortVideo.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Đã cập nhật thứ tự video",
    });
  } catch (error) {
    console.error("Reorder videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi sắp xếp lại video",
    });
  }
};
