// ============================================
// FILE: backend/src/modules/order/orderController.js
// Controller xử lý orders API
// ============================================

import Order from "./Order.js";
import UniversalProduct from "../product/UniversalProduct.js";

// ============================================
// GET ALL ORDERS (with pagination, filter, search)
// ============================================
export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      paymentStatus,
      paymentMethod,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = {};

    // IMPORTANT: Customers only see their own orders
    // Admin/Order Manager/Warehouse Staff see all orders
    if (req.user.role === "CUSTOMER") {
      filter.userId = req.user._id;
    }

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phoneNumber": { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("userId", "fullName email phoneNumber")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting orders:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

// ============================================
// GET ORDER BY ID
// ============================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "fullName email phoneNumber"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error getting order:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin đơn hàng",
      error: error.message,
    });
  }
};

// ============================================
// CREATE ORDER
// ============================================
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      total,
      shippingFee,
      discount,
      notes,
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng phải có ít nhất 1 sản phẩm",
      });
    }

    // Validate shipping address
    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phoneNumber ||
      !shippingAddress.detailAddress
    ) {
      return res.status(400).json({
        success: false,
        message: "Thông tin địa chỉ giao hàng không đầy đủ",
      });
    }

    // Generate order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${String(orderCount + 1).padStart(4, "0")}`;

    // Calculate subtotal
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Create order
    const order = new Order({
      userId: req.user._id,
      orderNumber,
      items,
      shippingAddress,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: "PENDING",
      status: "PENDING",
      subtotal,
      shippingFee: shippingFee || 0,
      discount: discount || 0,
      total: total || subtotal + (shippingFee || 0) - (discount || 0),
      notes,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Đã tạo đơn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo đơn hàng",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE ORDER STATUS
// ============================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "SHIPPING",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    order.status = status;

    // Update timestamps
    if (status === "CONFIRMED") {
      order.confirmedAt = new Date();
    } else if (status === "SHIPPING") {
      order.shippedAt = new Date();
    } else if (status === "DELIVERED") {
      order.deliveredAt = new Date();
    } else if (status === "CANCELLED") {
      order.cancelledAt = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng: ${status}`,
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE PAYMENT STATUS
// ============================================
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const validStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái thanh toán không hợp lệ",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === "PAID") {
      order.paidAt = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái thanh toán: ${paymentStatus}`,
      order,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái thanh toán",
      error: error.message,
    });
  }
};

// ============================================
// GET ORDER STATISTICS
// ============================================
export const getOrderStats = async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "PENDING" }),
      Order.countDocuments({ status: "SHIPPING" }),
      Order.countDocuments({ status: "DELIVERED" }),
      Order.countDocuments({ status: "CANCELLED" }),
      Order.aggregate([
        { $match: { status: "DELIVERED" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        shippingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Error getting order stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
      error: error.message,
    });
  }
};

// ============================================
// CANCEL ORDER
// ============================================
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Only allow cancel if order is PENDING or CONFIRMED
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy đơn hàng ở trạng thái này",
      });
    }

    order.status = "CANCELLED";
    order.cancelledAt = new Date();

    if (req.body.cancelReason) {
      order.cancelReason = req.body.cancelReason;
    }

    await order.save();

    res.json({
      success: true,
      message: "Đã hủy đơn hàng",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hủy đơn hàng",
      error: error.message,
    });
  }
};

export default {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStats,
  cancelOrder,
};