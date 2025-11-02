// controllers/promotionController.js
import Promotion from "../models/Promotion.js";
import PromotionUsage from "../models/PromotionUsage.js";
import mongoose from "mongoose";

/* ========================================
   HELPER: Tính giảm giá
   ======================================== */
const calculateDiscount = (totalAmount, type, value) => {
  if (type === "PERCENTAGE") {
    return Math.min((totalAmount * value) / 100, totalAmount);
  }
  return Math.min(value, totalAmount);
};

/* ========================================
   1. LẤY TẤT CẢ MÃ (ADMIN) – BỎ status
   ======================================== */
export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .populate("createdBy", "fullName email")
      .select(
        "name code discountType discountValue startDate endDate usageLimit usedCount minOrderValue createdAt"
      )
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { promotions } });
  } catch (error) {
    console.error("getAllPromotions error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

/* ========================================
   2. LẤY MÃ ĐANG HOẠT ĐỘNG (PUBLIC) – BỎ status
   ======================================== */
export const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();

    const promotions = await Promotion.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
    })
      .select(
        "name code discountType discountValue minOrderValue usageLimit usedCount endDate"
      )
      .sort({ endDate: 1 });

    res.json({ success: true, data: { promotions } });
  } catch (error) {
    console.error("getActivePromotions error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

/* ========================================
   3. TẠO MÃ KHUYẾN MÃI – Validate đầy đủ
   ======================================== */
export const createPromotion = async (req, res) => {
  try {
    const {
      name,
      code,
      discountType,
      discountValue,
      startDate,
      endDate,
      usageLimit,
      minOrderValue = 0,
    } = req.body;

    // === VALIDATE ===
    if (!code?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Mã code là bắt buộc" });
    }
    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return res
        .status(400)
        .json({ success: false, message: "Loại giảm giá không hợp lệ" });
    }
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Giá trị giảm không hợp lệ" });
    }
    if (discountType === "PERCENTAGE" && discountValue > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Phần trăm không được vượt 100%" });
    }
    if (!usageLimit || usageLimit < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Giới hạn lượt dùng phải ≥ 1" });
    }

    const normalizedCode = code.toUpperCase().trim();

    const existing = await Promotion.findOne({ code: normalizedCode });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Mã code đã tồn tại" });
    }

    const promotion = await Promotion.create({
      name: name?.trim(),
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimit: Number(usageLimit),
      minOrderValue: Number(minOrderValue),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Tạo mã khuyến mãi thành công",
      data: { promotion },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Mã code đã tồn tại" });
    }
    console.error("createPromotion error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ========================================
   4. CẬP NHẬT MÃ – Validate + Không cho sửa code đã dùng
   ======================================== */
export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mã khuyến mãi" });
    }

    // Không cho sửa code nếu đã dùng
    if (updates.code && updates.code.toUpperCase().trim() !== promotion.code) {
      const hasBeenUsed = await PromotionUsage.exists({ promotion: id });
      if (hasBeenUsed) {
        return res.status(400).json({
          success: false,
          message: "Không thể thay đổi mã đã được sử dụng",
        });
      }
      updates.code = updates.code.toUpperCase().trim();
    }

    // Validate discount
    if (
      updates.discountType &&
      !["PERCENTAGE", "FIXED"].includes(updates.discountType)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Loại giảm giá không hợp lệ" });
    }
    if (updates.discountValue !== undefined) {
      const val = Number(updates.discountValue);
      if (!Number.isFinite(val) || val < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Giá trị giảm không hợp lệ" });
      }
      if (updates.discountType === "PERCENTAGE" && val > 100) {
        return res
          .status(400)
          .json({ success: false, message: "Phần trăm không được vượt 100%" });
      }
      updates.discountValue = val;
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
   5. XÓA MÃ – Không cho xóa nếu đã dùng
   ======================================== */
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mã khuyến mãi" });
    }

    const hasUsage = await PromotionUsage.exists({ promotion: id });
    if (hasUsage) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa mã đã được sử dụng",
      });
    }

    await Promotion.findByIdAndDelete(id);
    res.json({ success: true, message: "Xóa mã khuyến mãi thành công" });
  } catch (error) {
    console.error("deletePromotion error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

/* ========================================
   6. ÁP DỤNG MÃ – TRANSACTION + ATOMIC + DÙNG isActive()
   ======================================== */
export const applyPromotion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { code, totalAmount } = req.body;
    const userId = req.user._id;

    // === VALIDATE INPUT ===
    if (!code?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Mã khuyến mãi là bắt buộc" });
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Tổng tiền không hợp lệ" });
    }

    const normalizedCode = code.toUpperCase().trim();
    const now = new Date();

    // === TÌM PROMOTION VỚI ĐIỀU KIỆN NGHIÊM NGẶT ===
    const promotion = await Promotion.findOne({
      code: normalizedCode,
      startDate: { $lte: now },
      endDate: { $gte: now },
      usedCount: {
        $lt: mongoose.Types.Decimal128.fromString(
          promotion?.usageLimit?.toString() || "0"
        ),
      }, // Fix $expr
    }).session(session);

    if (!promotion) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Mã khuyến mãi không hợp lệ, đã hết hạn hoặc hết lượt",
      });
    }

    // === DÙNG isActive() TRONG MODEL ===
    if (!promotion.isActive(totalAmount)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Đơn hàng phải từ ${promotion.minOrderValue.toLocaleString()}₫`,
      });
    }

    // === KIỂM TRA USER ĐÃ DÙNG CHƯA ===
    const alreadyUsed = await PromotionUsage.findOne({
      promotion: promotion._id,
      user: userId,
    }).session(session);

    if (alreadyUsed) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Bạn đã sử dụng mã này rồi!",
      });
    }

    // === TĂNG usedCount NGUYÊN TỬ ===
    const updated = await Promotion.findOneAndUpdate(
      {
        _id: promotion._id,
        usedCount: { $lt: promotion.usageLimit },
      },
      { $inc: { usedCount: 1 } },
      { new: true, session }
    );

    if (!updated) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Mã khuyến mãi đã hết lượt sử dụng!",
      });
    }

    // === TÍNH GIẢM GIÁ ===
    const discountAmount = calculateDiscount(
      totalAmount,
      promotion.discountType,
      promotion.discountValue
    );
    const discountedTotal = totalAmount - discountAmount;

    // === LƯU LỊCH SỬ ===
    await PromotionUsage.create(
      [
        {
          promotion: promotion._id,
          user: userId,
          orderTotal: totalAmount,
          discountAmount,
        },
      ],
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
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("applyPromotion error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống, vui lòng thử lại" });
  } finally {
    session.endSession();
  }
};
