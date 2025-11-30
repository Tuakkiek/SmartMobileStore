// controllers/promotionController.js
import Promotion from "../models/Promotion.js";
import PromotionUsage from "../models/PromotionUsage.js";
import mongoose from "mongoose";

/* ========================================
   1. LẤY TẤT CẢ MÃ (ADMIN)
   ======================================== */
export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .populate("createdBy", "fullName email")
      .select(
        "name code discountType discountValue maxDiscountAmount startDate endDate usageLimit usedCount minOrderValue isActive createdAt"
      )
      .sort({ createdAt: -1 });

    const data = promotions.map((p) => ({
      ...p.toObject(),
      displayText: p.getDisplayText(),
    }));

    res.json({ success: true, data: { promotions: data } });
  } catch (error) {
    console.error("getAllPromotions error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

/* ========================================
   2. LẤY MÃ ĐANG HOẠT ĐỘNG (PUBLIC)
   ======================================== */
export const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();

    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
    })
      .select(
        "name code discountType discountValue maxDiscountAmount minOrderValue usageLimit usedCount endDate"
      )
      .sort({ endDate: 1 });

    const data = promotions.map((p) => ({
      ...p.toObject(),
      displayText: p.getDisplayText(),
    }));

    res.json({ success: true, data: { promotions: data } });
  } catch (error) {
    console.error("getActivePromotions error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

/* ========================================
   3. TẠO MÃ KHUYẾN MÃI
   ======================================== */
export const createPromotion = async (req, res) => {
  try {
    const {
      name,
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimit,
      minOrderValue = 0,
      isActive = true,
    } = req.body;

    // Validate cơ bản
    if (!code?.trim()) return res.status(400).json({ success: false, message: "Mã code là bắt buộc" });
    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return res.status(400).json({ success: false, message: "Loại giảm giá không hợp lệ" });
    }

    const val = Number(discountValue);
    if (!Number.isFinite(val) || val <= 0 || (discountType === "PERCENTAGE" && val > 100)) {
      return res.status(400).json({ success: false, message: "Giá trị giảm không hợp lệ" });
    }

    if (!usageLimit || usageLimit < 1) {
      return res.status(400).json({ success: false, message: "Giới hạn lượt dùng phải ≥ 1" });
    }

    // Xử lý maxDiscountAmount
    let maxVal = null;
    if (discountType === "PERCENTAGE" && maxDiscountAmount !== undefined) {
      maxVal = Number(maxDiscountAmount);
      if (!Number.isFinite(maxVal) || maxVal < 0) {
        return res.status(400).json({ success: false, message: "Số tiền giảm tối đa không hợp lệ" });
      }
    }

    const normalizedCode = code.toUpperCase().trim();
    const existing = await Promotion.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ success: false, message: "Mã code đã tồn tại" });
    }

    const promotion = await Promotion.create({
      name: name?.trim(),
      code: normalizedCode,
      discountType,
      discountValue: val,
      maxDiscountAmount: maxVal,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimit: Number(usageLimit),
      minOrderValue: Number(minOrderValue),
      isActive: Boolean(isActive),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Tạo mã khuyến mãi thành công",
      data: { promotion },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Mã code đã tồn tại" });
    }
    console.error("createPromotion error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ========================================
   4. CẬP NHẬT MÃ
   ======================================== */
export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mã khuyến mãi" });
    }

    // Không cho sửa code nếu đã dùng
    if (updates.code && updates.code.toUpperCase().trim() !== promotion.code) {
      const hasBeenUsed = await PromotionUsage.exists({ promotion: id });
      if (hasBeenUsed) {
        return res.status(400).json({ success: false, message: "Không thể thay đổi mã đã được sử dụng" });
      }
      updates.code = updates.code.toUpperCase().trim();
    }

    // Validate discountValue
    if (updates.discountValue !== undefined) {
      const val = Number(updates.discountValue);
      const type = updates.discountType || promotion.discountType;
      if (!Number.isFinite(val) || val <= 0 || (type === "PERCENTAGE" && val > 100)) {
        return res.status(400).json({ success: false, message: "Giá trị giảm không hợp lệ" });
      }
      updates.discountValue = val;
    }

    // Validate maxDiscountAmount
    if (updates.maxDiscountAmount !== undefined) {
      const type = updates.discountType || promotion.discountType;
      if (type === "PERCENTAGE") {
        const maxVal = Number(updates.maxDiscountAmount);
        if (!Number.isFinite(maxVal) || maxVal < 0) {
          return res.status(400).json({ success: false, message: "Số tiền giảm tối đa không hợp lệ" });
        }
        updates.maxDiscountAmount = maxVal;
      } else {
        updates.maxDiscountAmount = null;
      }
    }

    if (updates.isActive !== undefined) {
      updates.isActive = Boolean(updates.isActive);
    }

    Object.assign(promotion, updates);
    await promotion.save();

    res.json({
      success: true,
      message: "Cập nhật mã khuyến mãi thành công",
      data: { promotion },
    });
  } catch (error) {
    console.error("updatePromotion error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ========================================
   5. XÓA MÃ
   ======================================== */
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mã khuyến mãi" });
    }

    const hasUsage = await PromotionUsage.exists({ promotion: id });
    if (hasUsage) {
      return res.status(400).json({ success: false, message: "Không thể xóa mã đã được sử dụng" });
    }

    await Promotion.findByIdAndDelete(id);
    res.json({ success: true, message: "Xóa mã khuyến mãi thành công" });
  } catch (error) {
    console.error("deletePromotion error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

/* ========================================
   6. ÁP DỤNG MÃ – ĐÃ SỬA DÙNG canBeUsed()
   ======================================== */
export const applyPromotion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { code, totalAmount, orderId } = req.body;
    const userId = req.user._id;

    if (!code?.trim()) {
      return res.status(400).json({ success: false, message: "Mã khuyến mãi là bắt buộc" });
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return res.status(400).json({ success: false, message: "Tổng tiền không hợp lệ" });
    }

    const normalizedCode = code.toUpperCase().trim();
    const promotion = await Promotion.findOne({ code: normalizedCode }).session(session);

    if (!promotion) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Mã khuyến mãi không tồn tại" });
    }

    // ĐÃ SỬA: dùng canBeUsed() thay vì isActive()
    if (!promotion.canBeUsed(totalAmount)) {
      await session.abortTransaction();
      const reasons = [];
      if (!promotion.isActive) reasons.push("đã bị tắt");
      const now = new Date();
      if (now < promotion.startDate || now > promotion.endDate) reasons.push("ngoài thời gian");
      if (promotion.usedCount >= promotion.usageLimit) reasons.push("hết lượt dùng");
      if (totalAmount < promotion.minOrderValue) {
        reasons.push(`đơn tối thiểu ${promotion.minOrderValue.toLocaleString()}₫`);
      }
      return res.status(400).json({
        success: false,
        message: `Mã không dùng được: ${reasons.join(", ")}`,
      });
    }

    // Kiểm tra user đã dùng chưa
    const alreadyUsed = await PromotionUsage.findOne({
      promotion: promotion._id,
      user: userId,
    }).session(session);

    if (alreadyUsed) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Bạn đã sử dụng mã này rồi!" });
    }

    // Tăng lượt dùng + tính giảm giá
    await promotion.incrementUsage(session);
    const discountedTotal = promotion.applyDiscount(totalAmount);
    const discountAmount = totalAmount - discountedTotal;

    // Lưu lịch sử
    await PromotionUsage.create(
      [{
        promotion: promotion._id,
        user: userId,
        order: orderId || null,
        orderTotal: totalAmount,
        discountAmount,
        snapshot: {
          code: promotion.code,
          name: promotion.name,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          maxDiscountAmount: promotion.maxDiscountAmount,
        },
      }],
      { session }
    );

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Áp dụng mã thành công!",
      data: {
        discountAmount,
        discountedTotal,
        code: promotion.code,
        displayText: promotion.getDisplayText(),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("applyPromotion error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống, vui lòng thử lại" });
  } finally {
    session.endSession();
  }
};

/* ========================================
   7 & 8. LỊCH SỬ SỬ DỤNG (giữ nguyên – đã ổn)
   ======================================== */
export const getPromotionUsageHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const usages = await PromotionUsage.find({ promotion: id })
      .populate("user", "fullName email phone")
      .populate("promotion", "code name")
      .populate("order", "orderNumber totalAmount status")
      .select("user promotion order orderTotal discountAmount snapshot usedAt createdAt")
      .sort({ usedAt: -1 });

    res.json({ success: true, data: { usages, total: usages.length } });
  } catch (error) {
    console.error("getPromotionUsageHistory error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

export const getMyPromotionUsage = async (req, res) => {
  try {
    const userId = req.user._id;
    const usages = await PromotionUsage.find({ user: userId })
      .populate("promotion", "code name discountType discountValue maxDiscountAmount endDate")
      .populate("order", "orderNumber totalAmount status")
      .select("promotion order orderTotal discountAmount snapshot usedAt")
      .sort({ usedAt: -1 });

    res.json({
      success: true,
      data: {
        usages,
        total: usages.length,
        message: usages.length ? null : "Bạn chưa sử dụng mã khuyến mãi nào",
      },
    });
  } catch (error) {
    console.error("getMyPromotionUsage error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};