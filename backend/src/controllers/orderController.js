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
// CREATE ORDER - FIXED + APPLY PROMOTION PER ITEM
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

    // === VALIDATE & POPULATE CART ITEMS ===
    const orderItems = [];
    let subtotal = 0;
    const requestItems = req.body.items || [];

    for (const reqItem of requestItems) {
      const { variantId, productType, quantity } = reqItem;

      const cartItem = cart.items.find(
        (ci) => ci.variantId.toString() === variantId.toString()
      );
      if (!cartItem) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${variantId} không có trong giỏ hàng`,
        });
      }

      const models = getModelsByType(productType);
      if (!models) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Loại sản phẩm không hợp lệ: ${productType}`,
        });
      }

      const variant = await models.Variant.findById(variantId).session(session);
      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy biến thể sản phẩm (Variant ID: ${variantId})`,
        });
      }

      const product = await models.Product.findById(variant.productId).session(
        session
      );
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm (ID: ${variant.productId})`,
        });
      }

      // Kiểm tra tồn kho
      if (variant.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} (${
            variant.color || variant.variantName || "N/A"
          }) chỉ còn ${variant.stock} sản phẩm`,
        });
      }

      // Kiểm tra trạng thái sản phẩm
      if (product.status !== "AVAILABLE") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} hiện không còn bán`,
        });
      }

      // Cập nhật stock & salesCount
      variant.stock -= quantity;
      variant.salesCount = (variant.salesCount || 0) + quantity;
      await variant.save({ session });

      product.salesCount = (product.salesCount || 0) + quantity;
      await product.save({ session });

      // Tính tiền
      const itemTotal = variant.price * quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productType,
        productName: product.name,
        variantSku: variant.sku,
        variantColor: variant.color,
        variantStorage: variant.storage || variant.variantName,
        variantConnectivity: variant.connectivity,
        variantName: variant.variantName,
        variantCpuGpu: variant.cpuGpu,
        variantRam: variant.ram,
        quantity,
        price: variant.price,
        originalPrice: variant.originalPrice,
        total: itemTotal,
        images: variant.images || [],
        // Thêm sau khi apply promotion
        discount: 0,
        finalTotal: itemTotal,
        finalPrice: variant.price,
      });
    }

    // ==============================
    // XỬ LÝ PROMOTION CODE
    // ==============================
    let promotionDiscount = 0;
    let appliedPromotion = null;

    if (promotionCode) {
      try {
        const apiUrl = process.env.API_URL || "http://localhost:5000/api";
        const promoResponse = await axios.post(
          `${apiUrl}/promotions/apply`,
          { code: promotionCode, totalAmount: subtotal },
          { headers: { Authorization: req.headers.authorization } }
        );

        if (promoResponse.data.success) {
          promotionDiscount = promoResponse.data.data.discountAmount;
          appliedPromotion = {
            code: promotionCode,
            discountAmount: promotionDiscount,
          };
        }
      } catch (promoError) {
        console.log("Promotion error:", promoError.message);
      }
    }

    // ==============================
    // PHÂN BỔ GIẢM GIÁ THEO TỶ LỆ
    // ==============================
    if (promotionDiscount > 0 && subtotal > 0) {
      let remainingDiscount = promotionDiscount;
      orderItems.forEach((item, index) => {
        const isLast = index === orderItems.length - 1;
        const share = item.total / subtotal;
        const allocated = isLast
          ? remainingDiscount
          : Math.round(promotionDiscount * share);

        item.discount = allocated;
        item.finalTotal = item.total - allocated;
        item.finalPrice = Math.round(item.finalTotal / item.quantity);

        remainingDiscount -= allocated;
      });
    }

    // Tính phí vận chuyển
    const shippingFee = subtotal >= 5000000 ? 0 : 50000;

    // Tổng tạm tính
    let total =
      orderItems.reduce((sum, item) => sum + item.finalTotal, 0) + shippingFee;

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
          totalAmount: total,
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
      data: {
        order: order[0],
        redirectUrl: `/orders/${order[0]._id}`,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CREATE ORDER ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo đơn hàng",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET MY ORDERS – ĐÃ SỬA: TRẢ VỀ ĐỦ TRƯỜNG CẦN THIẾT
// ============================================
export const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { customerId: req.user._id };
    if (status) query.status = status;

    // CHỌN CÁC TRƯỜNG CẦN THIẾT TRONG items
    const orders = await Order.find(query)
      .select(
        `
        orderNumber
        createdAt
        status
        totalAmount
        items.productName
        items.quantity
        items.price
        items.images
        items.variantColor
        items.variantStorage
        items.variantName
        items.variantConnectivity
      `
      )
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
// GET ORDER BY ID (ĐÃ SỬA LOGIC PHÂN QUYỀN)
// ============================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select(
        "orderNumber createdAt status totalAmount shippingAddress paymentMethod note " +
          "subtotal shippingFee promotionDiscount appliedPromotion pointsUsed " +
          "items.productName items.quantity items.price items.images " +
          "items.variantColor items.variantStorage items.variantName items.variantConnectivity " +
          "items.variantSku items.originalPrice items.total " +
          "statusHistory posInfo paymentInfo customerId" // <-- Đã thêm customerId
      )
      .populate("customerId", "fullName phoneNumber email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // === THÊM LOG ĐỂ DEBUG ===
    const userId = req.user._id.toString();
    console.log("=== ORDER ACCESS CHECK ===");
    console.log("User ID:", userId);
    console.log("User Role:", req.user.role);
    console.log("Order ID:", order._id.toString());
    console.log("Order customerId:", order.customerId._id.toString());
    // console.log("Order posInfo:", JSON.stringify(order.posInfo, null, 2));
    // console.log(
    //   "Order paymentInfo:",
    //   JSON.stringify(order.paymentInfo, null, 2)
    // );

    const isOwner = order.customerId._id.toString() === userId;
    const isAdmin = ["ADMIN", "ORDER_MANAGER"].includes(req.user.role);
    const isPOSStaff = req.user.role === "POS_STAFF";
    const isCashier = req.user.role === "CASHIER";

    console.log("isOwner:", isOwner);
    console.log("isAdmin:", isAdmin);
    console.log("isPOSStaff:", isPOSStaff);
    console.log("isCashier:", isCashier);

    // ============================================
    // === LOGIC PHÂN QUYỀN ĐÃ SỬA ===
    // ============================================
    // Kiểm tra xem đây có phải là đơn hàng POS không (có posInfo hoặc paymentInfo)
    const isPOSOrder = !!order.posInfo || !!order.paymentInfo;
    console.log("isPOSOrder:", isPOSOrder);

    if (
      !isOwner &&
      !isAdmin &&
      // Logic mới:
      // Nếu KHÔNG PHẢI là ( (người dùng có vai trò POS/Cashier) VÀ (đây là đơn POS) )
      // thì mới từ chối.
      !((isPOSStaff || isCashier) && isPOSOrder)
    ) {
      console.log(
        "❌ ACCESS DENIED - User is not Owner, Admin, or relevant POS/Cashier"
      );
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này",
      });
    }
    // ============================================
    // === KẾT THÚC SỬA ĐỔI ===
    // ============================================

    console.log("✅ ACCESS GRANTED");
    console.log("========================");

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
// CANCEL ORDER (Customer) - FIXED
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

    // ✅ FIXED: Hoàn lại stock - KHÔNG GỌI incrementSales()
    for (const item of order.items) {
      const models = getModelsByType(item.productType);
      if (models) {
        const variant = await models.Variant.findById(item.variantId).session(
          session
        );
        if (variant) {
          variant.stock += item.quantity;
          variant.salesCount = Math.max(
            0,
            (variant.salesCount || 0) - item.quantity
          );
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
    order.cancelReason = req.body?.reason || "Khách hàng hủy đơn";

    order.statusHistory.push({
      status: "CANCELLED",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      note: req.body?.reason || "Khách hàng hủy đơn",
    });

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, note } = req.body;
    const adminId = req.user._id;

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Xác thực chuyển trạng thái
    const validTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      PENDING_PAYMENT: ["PAYMENT_VERIFIED", "CANCELLED"],
      PAYMENT_VERIFIED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPING", "CANCELLED"],
      SHIPPING: ["DELIVERED", "RETURNED", "CANCELLED"],
      DELIVERED: ["RETURNED"],
      RETURNED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${getStatusText(
          order.status
        )}" sang "${getStatusText(status)}"`,
      });
    }

    // ✅ FIXED: Hoàn kho khi hủy/trả hàng - KHÔNG GỌI incrementSales()
    if (
      ["CANCELLED", "RETURNED"].includes(status) &&
      !["CANCELLED", "RETURNED"].includes(order.status)
    ) {
      for (const item of order.items) {
        const models = getModelsByType(item.productType);
        if (models) {
          const variant = await models.Variant.findById(item.variantId).session(
            session
          );
          if (variant) {
            variant.stock += item.quantity;
            variant.salesCount = Math.max(
              0,
              (variant.salesCount || 0) - item.quantity
            );
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
    }

    // Cập nhật thời gian
    const now = new Date();
    if (status === "CONFIRMED") order.confirmedAt = now;
    if (status === "SHIPPING") order.shippingAt = now;
    if (status === "DELIVERED") order.deliveredAt = now;
    if (status === "RETURNED") order.returnedAt = now;
    if (status === "CANCELLED") order.cancelledAt = now;

    // Cập nhật trạng thái + lịch sử
    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy: adminId,
      updatedAt: now,
      note: note || getDefaultNote(order.status, status),
    });

    await order.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: { order },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  } finally {
    session.endSession();
  }
};
// Helper: Ghi chú mặc định
const getDefaultNote = (from, to) => {
  const notes = {
    CANCELLED: "Đơn hàng bị hủy bởi admin",
    RETURNED: "Khách hàng trả hàng",
  };
  return notes[to] || "";
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
          totalAmount: { $sum: "$totalAmount" }, // ĐÃ SỬA: dùng totalAmount
        },
      },
    ]);

    const totalOrders = await Order.countDocuments(dateFilter);
    const totalRevenue = await Order.aggregate([
      { $match: { ...dateFilter, status: "DELIVERED" } }, // hoặc RETURNED nếu cần
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
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
