// ============================================
// FILE: backend/src/controllers/reviewController.js
// ✅ FIXED: Proper named exports
// ============================================

import Review from "../models/Review.js";
import IPhone from "../models/IPhone.js";
import IPad from "../models/IPad.js";
import Mac from "../models/Mac.js";
import AirPods from "../models/AirPods.js";
import AppleWatch from "../models/AppleWatch.js";
import Accessory from "../models/Accessory.js";

// ✅ Helper: Find product and update rating
const findProductAndUpdateRating = async (productId) => {
  const models = [IPhone, IPad, Mac, AirPods, AppleWatch, Accessory];

  for (const Model of models) {
    const product = await Model.findById(productId);
    if (product) {
      const reviews = await Review.find({ productId });

      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        product.averageRating = Math.round((sum / reviews.length) * 10) / 10;
        product.totalReviews = reviews.length;
      } else {
        product.averageRating = 0;
        product.totalReviews = 0;
      }

      await product.save();
      return product;
    }
  }

  return null;
};

// ============================================
// GET PRODUCT REVIEWS
// ============================================
export const getProductReviews = async (req, res) => {
  try {
    const query = { productId: req.params.productId };

    if (!req.user || req.user.role !== "ADMIN") {
      query.isHidden = false;
    }

    const reviews = await Review.find(query)
      .populate("customerId", "fullName avatar")
      .populate("adminReply.adminId", "fullName role avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { reviews } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// CREATE REVIEW
// ============================================
export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment, productModel } = req.body;

    const product = await findProductAndUpdateRating(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    const review = await Review.create({
      productId,
      productModel,
      customerId: req.user._id,
      rating,
      comment,
    });

    await findProductAndUpdateRating(productId);

    res.status(201).json({
      success: true,
      message: "Đánh giá sản phẩm thành công",
      data: { review },
    });
  } catch (error) {
    console.error("❌ Create review error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đánh giá sản phẩm này rồi",
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// UPDATE REVIEW
// ============================================
export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa đánh giá này",
      });
    }

    const { rating, comment } = req.body;
    review.rating = rating;
    review.comment = comment;
    await review.save();

    await findProductAndUpdateRating(review.productId);

    res.json({
      success: true,
      message: "Cập nhật đánh giá thành công",
      data: { review },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// DELETE REVIEW
// ============================================
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa đánh giá này",
      });
    }

    const productId = review.productId;
    await review.deleteOne();

    await findProductAndUpdateRating(productId);

    res.json({ success: true, message: "Xóa đánh giá thành công" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ✅ LIKE/UNLIKE REVIEW
// ============================================
export const likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    const userId = req.user._id;
    const hasLiked = review.likedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      // Unlike
      review.likedBy = review.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      review.helpful = Math.max(0, review.helpful - 1);
    } else {
      // Like
      review.likedBy.push(userId);
      review.helpful += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: hasLiked ? "Đã bỏ thích" : "Đã thích đánh giá",
      data: {
        review,
        hasLiked: !hasLiked,
        helpful: review.helpful,
      },
    });
  } catch (error) {
    console.error("❌ Like review error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADMIN: REPLY TO REVIEW
// ============================================
export const replyToReview = async (req, res) => {
  try {
    const { content } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung phản hồi",
      });
    }

    review.adminReply = {
      content: content.trim(),
      adminId: req.user._id,
      repliedAt: new Date(),
    };

    await review.save();
    await review.populate("adminReply.adminId", "fullName role avatar");

    res.json({
      success: true,
      message: "Phản hồi thành công",
      data: { review },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADMIN: UPDATE REPLY
// ============================================
export const updateAdminReply = async (req, res) => {
  try {
    const { content } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    if (!review.adminReply?.content) {
      return res.status(400).json({
        success: false,
        message: "Chưa có phản hồi để chỉnh sửa",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung phản hồi",
      });
    }

    review.adminReply.content = content.trim();
    review.adminReply.repliedAt = new Date();

    await review.save();
    await review.populate("adminReply.adminId", "fullName role avatar");

    res.json({
      success: true,
      message: "Cập nhật phản hồi thành công",
      data: { review },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADMIN: TOGGLE REVIEW VISIBILITY
// ============================================
export const toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    review.isHidden = !review.isHidden;
    await review.save();

    res.json({
      success: true,
      message: review.isHidden ? "Đã ẩn đánh giá" : "Đã hiển thị đánh giá",
      data: { review },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
