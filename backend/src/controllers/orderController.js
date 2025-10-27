// backend/src/controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import { recordOrderSales } from "../services/salesAnalyticsService.js"; // ✅ IMPORT

// Tạo đơn hàng mới
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Sản phẩm ${item.productId} không tồn tại`,
        });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${product.name} không đủ số lượng`,
        });
      }

      orderItems.push({
        productId: product._id,
        productName: product.name,
        specifications: product.specifications,
        quantity: item.quantity,
        price: product.price,
        discount: product.discount || 0,
      });

      totalAmount += item.quantity * product.price;
      product.quantity -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      customerId: req.user._id,
      items: orderItems,
      shippingAddress,
      totalAmount,
      paymentMethod,
      notes,
      statusHistory: [
        {
          status: "PENDING",
          updatedBy: req.user._id,
          updatedAt: new Date(),
          note: "Đơn hàng được tạo",
        },
      ],
    });

    // Làm trống giỏ hàng sau khi đặt hàng
    await Cart.findOneAndUpdate({ customerId: req.user._id }, { items: [] });

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: { order },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy danh sách đơn hàng của người dùng
export const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { customerId: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("items.productId", "name images");

    const count = await Order.countDocuments(query);
    res.json({
      success: true,
      data: {
        orders,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy tất cả đơn hàng (quản trị viên)
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.orderNumber = { $regex: search, $options: "i" };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("customerId", "fullName phoneNumber")
      .populate("items.productId", "name images");

    const count = await Order.countDocuments(query);
    res.json({
      success: true,
      data: {
        orders,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy đơn hàng theo ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "fullName phoneNumber email")
      .populate("items.productId", "name images")
      .populate("statusHistory.updatedBy", "fullName");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (
      req.user.role === "CUSTOMER" &&
      order.customerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này",
      });
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ UPDATED: Cập nhật trạng thái đơn hàng + Record Sales khi DELIVERED
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    console.log("Received status:", status, "note:", note);

    const VALID_STATUSES = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPING",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!status || !VALID_STATUSES.includes(status)) {
      console.log("Invalid status:", status);
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Phải là một trong: ${VALID_STATUSES.join(
          ", "
        )}`,
      });
    }

    const order = await Order.findById(req.params.id);
    console.log("Current order status before update:", order.status);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Không thể cập nhật đơn hàng đã hoàn thành hoặc đã hủy",
      });
    }

    // ✅ THÊM: Record sales khi chuyển sang DELIVERED
    if (status === "DELIVERED" && order.status !== "DELIVERED") {
      try {
        await recordOrderSales(order);
        console.log(
          "✅ Sales recorded successfully for order:",
          order.orderNumber
        );
      } catch (salesError) {
        console.error("❌ Failed to record sales:", salesError);
        // Không block update status, chỉ log error
      }
    }

    // Gọi update
    const updatedOrder = await order.updateStatus(status, req.user._id, note);
    console.log("Updated order status after save:", updatedOrder.status);

    res.json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: { order: updatedOrder },
    });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
      });
    }
    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn hàng đang chờ xử lý",
      });
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity },
      });
    }

    order.addStatusHistory("CANCELLED", req.user._id, "Khách hàng hủy đơn");
    await order.save();

    res.json({
      success: true,
      message: "Hủy đơn hàng thành công",
      data: { order },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
