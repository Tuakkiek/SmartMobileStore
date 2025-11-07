// ============================================
// FILE: backend/src/controllers/orderController.js
// ✅ COMPLETE: Order management with multi-model support + Promotion Code
// ============================================

import mongoose from "mongoose";
import axios from "axios";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

// Helper: Lấy Model và Variant Model dựa trên productType
const getModelsByType = (productType) => {
  const models = {
    iPhone: { Product: IPhone, Variant: IPhoneVariant },
    iPad: { Product: IPad, Variant: IPadVariant },
    Mac: { Product: Mac, Variant: MacVariant },
    AirPods: { Product: AirPods, Variant: AirPodsVariant },
    AppleWatch: { Product: AppleWatch, Variant: AppleWatchVariant },
    Accessory: { Product: Accessory, Variant: AccessoryVariant },
  };
  return models[productType] || null;
};

// ============================================
// CREATE ORDER (Checkout from cart)
// ============================================
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      shippingAddress,
      paymentMethod,
      note,
      useRewardPoints = false,
      promotionCode,
    } = req.body;

    // Lấy giỏ hàng
    const cart = await Cart.findOne({ customerId: req.user._id }).session(
      session
    );

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    // === THAY THẾ TOÀN BỘ PHẦN VALIDATE & POPULATE CART ITEMS ===
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const models = getModelsByType(item.productType);
      if (!models) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Loại sản phẩm không hợp lệ: ${item.productType}`,
        });
      }

      const variant = await models.Variant.findById(item.variantId).session(
        session
      );
      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy biến thể: ${item.variantId}`,
        });
      }

      const product = await models.Product.findById(variant.productId).session(
        session
      );
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm`,
        });
      }

      // Kiểm tra tồn kho
      if (variant.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} (${
            variant.color || variant.variantName
          }) chỉ còn ${variant.stock} sản phẩm`,
        });
      }

      // Giảm stock
      variant.stock -= item.quantity;
      await variant.save({ session });

      // Tăng salesCount
      product.salesCount = (product.salesCount || 0) + item.quantity;
      await product.save({ session });

      // Tính tiền theo giá bán (price), không dùng originalPrice
      const itemTotal = variant.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productType: item.productType,
        productName: product.name,
        variantSku: variant.sku,
        variantColor: variant.color,
        variantStorage: variant.storage || variant.variantName, // Hỗ trợ iPhone & AirPods
        variantConnectivity: variant.connectivity, // Hỗ trợ iPad
        variantName: variant.variantName, // AirPods, AppleWatch
        quantity: item.quantity,
        price: variant.price, // Giá bán thực tế
        originalPrice: variant.originalPrice, // Giá gạch ngang
        total: itemTotal,
        images: variant.images || [],
      });
    }
    // ===========================================================

    // XỬ LÝ PROMOTION CODE
    let promotionDiscount = 0;
    let appliedPromotion = null;

    if (promotionCode) {
      try {
        const promoResponse = await axios.post(
          `${process.env.API_URL}/promotions/apply`,
          {
            code: promotionCode,
            totalAmount: subtotal,
          },
          {
            headers: {
              Authorization: req.headers.authorization,
            },
          }
        );

        if (promoResponse.data.success) {
          promotionDiscount = promoResponse.data.data.discountAmount;
          appliedPromotion = {
            code: promotionCode,
            discountAmount: promotionDiscount,
          };
        }
      } catch (promoError) {
        console.log("Promotion code invalid:", promoError.message);
        // Không dừng flow, chỉ bỏ qua
      }
    }

    // Tính phí vận chuyển
    const shippingFee = subtotal >= 5000000 ? 0 : 50000;

    // Tổng tạm tính
    let total = subtotal + shippingFee - promotionDiscount;

    // Xử lý reward points
    let pointsUsed = 0;
    if (useRewardPoints && req.user.rewardPoints > 0) {
      const maxPoints = Math.min(req.user.rewardPoints, Math.floor(total / 10));
      pointsUsed = maxPoints;
      total -= pointsUsed;
      req.user.rewardPoints -= pointsUsed;
      await req.user.save({ session });
    }

    // Tạo đơn hàng
    const order = await Order.create(
      [
        {
          customerId: req.user._id,
          items: orderItems,
          shippingAddress,
          paymentMethod,
          note,
          subtotal,
          shippingFee,
          promotionDiscount,
          appliedPromotion,
          pointsUsed,
          total,
          status: "PENDING",
        },
      ],
      { session }
    );

    // Xóa giỏ hàng
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: { order: order[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create order error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo đơn hàng",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET MY ORDERS
// ============================================
export const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { customerId: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate("customerId", "fullName phoneNumber")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET ORDER BY ID
// ============================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "customerId",
      "fullName phoneNumber email"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (
      order.customerId._id.toString() !== req.user._id.toString() &&
      !["ADMIN", "ORDER_MANAGER"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này",
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// CANCEL ORDER (Customer)
// ============================================
export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.customerId.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
      });
    }

    if (order.status !== "PENDING") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn hàng đang chờ xử lý",
      });
    }

    // Hoàn lại stock
    for (const item of order.items) {
      const models = getModelsByType(item.productType);
      if (models) {
        const variant = await models.Variant.findById(item.variantId).session(
          session
        );
        if (variant) {
          variant.stock += item.quantity;
          await variant.save({ session });
        }

        const product = await models.Product.findById(item.productId).session(
          session
        );
        if (product) {
          product.salesCount = Math.max(
            0,
            (product.salesCount || 0) - item.quantity
          );
          await product.save({ session });
        }
      }
    }

    // Hoàn lại reward points
    if (order.pointsUsed > 0) {
      const user = await mongoose
        .model("User")
        .findById(order.customerId)
        .session(session);
      if (user) {
        user.rewardPoints += order.pointsUsed;
        await user.save({ session });
      }
    }

    order.status = "CANCELLED";
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || "Khách hàng hủy đơn";
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Hủy đơn hàng thành công",
      data: { order },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Cancel order error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET ALL ORDERS (Admin/Order Manager)
// ============================================
export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
    } = req.query;
    const query = {};

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { _id: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phoneNumber": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await Order.find(query)
      .populate("customerId", "fullName phoneNumber email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// UPDATE ORDER STATUS (Admin/Order Manager)
// ============================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const validTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPING", "CANCELLED"],
      SHIPPING: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["COMPLETED"],
      CANCELLED: [],
      COMPLETED: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ ${order.status} sang ${status}`,
      });
    }

    order.status = status;

    if (status === "CONFIRMED") order.confirmedAt = new Date();
    if (status === "SHIPPING") order.shippingAt = new Date();
    if (status === "DELIVERED") order.deliveredAt = new Date();
    if (status === "COMPLETED") order.completedAt = new Date();
    if (status === "CANCELLED") {
      order.cancelledAt = new Date();
      order.cancelReason = req.body.cancelReason || "Admin hủy đơn";
    }

    await order.save();

    res.json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: { order },
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET ORDER STATISTICS (Admin)
// ============================================
export const getOrderStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments(dateFilter);
    const totalRevenue = await Order.aggregate([
      { $match: { ...dateFilter, status: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    res.json({
      success: true,
      data: {
        stats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get order statistics error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStatistics,
};
