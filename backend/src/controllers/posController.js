// ============================================
// FILE: backend/src/controllers/posController.js
// ✅ ADDED: Stats API for Cashier Dashboard
// ============================================

import mongoose from "mongoose";
import Order from "../models/Order.js";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

const getModelsByType = (productType) => {
  const map = {
    iPhone: { Product: IPhone, Variant: IPhoneVariant },
    iPad: { Product: IPad, Variant: IPadVariant },
    Mac: { Product: Mac, Variant: MacVariant },
    AirPods: { Product: AirPods, Variant: AirPodsVariant },
    AppleWatch: { Product: AppleWatch, Variant: AppleWatchVariant },
    Accessory: { Product: Accessory, Variant: AccessoryVariant },
  };
  return map[productType] || null;
};

// ============================================
// 1. TẠO ĐƠN HÀNG POS
// ============================================
export const createPOSOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, customerInfo, storeLocation, totalAmount, promotionCode } =
      req.body;

    if (!items?.length) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Giỏ hàng trống" });
    }
    if (!customerInfo?.fullName || !customerInfo?.phoneNumber) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin khách hàng" });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { variantId, productType, quantity } = item;
      const models = getModelsByType(productType);
      if (!models) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({
            success: false,
            message: `Loại sản phẩm không hợp lệ: ${productType}`,
          });
      }

      const variant = await models.Variant.findById(variantId).session(session);
      if (!variant) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({
            success: false,
            message: `Không tìm thấy biến thể ID: ${variantId}`,
          });
      }

      const product = await models.Product.findById(variant.productId).session(
        session
      );
      if (!product) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy sản phẩm" });
      }

      if (variant.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} (${variant.color || ""}) chỉ còn ${
            variant.stock
          } sản phẩm`,
        });
      }

      variant.stock -= quantity;
      variant.salesCount = (variant.salesCount || 0) + quantity;
      await variant.save({ session });

      product.salesCount = (product.salesCount || 0) + quantity;
      await product.save({ session });

      const price = item.price ?? variant.price;
      const originalPrice =
        item.originalPrice ?? variant.originalPrice ?? variant.price;
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productType,
        productName: product.name,
        variantSku: variant.sku,
        variantColor: variant.color || "",
        variantStorage: variant.storage || "",
        variantConnectivity: variant.connectivity || "",
        variantName: variant.variantName || "",
        variantCpuGpu: variant.cpuGpu || "",
        variantRam: variant.ram || "",
        quantity,
        price,
        originalPrice,
        total: itemTotal,
        images: variant.images || [],
      });
    }

    const receiptNumber = `TMP${Date.now().toString().slice(-8)}`;
    const finalTotal = totalAmount ?? subtotal;

    const order = await Order.create(
      [
        {
          orderSource: "IN_STORE",
          customerId: req.user._id,
          items: orderItems,
          shippingAddress: {
            fullName: customerInfo.fullName,
            phoneNumber: customerInfo.phoneNumber,
            province: storeLocation || "Cần Thơ",
            ward: "Ninh Kiều",
            detailAddress: "Mua tại cửa hàng",
          },
          paymentMethod: "CASH",
          paymentStatus: "UNPAID",
          status: "PENDING_PAYMENT",
          subtotal,
          shippingFee: 0,
          promotionDiscount: 0,
          appliedPromotion: promotionCode
            ? { code: promotionCode, discountAmount: 0 }
            : null,
          totalAmount: finalTotal,
          posInfo: {
            staffId: req.user._id,
            staffName: req.user.fullName,
            storeLocation: storeLocation || "Ninh Kiều iStore",
            receiptNumber,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Tạo đơn thành công. Đã chuyển cho Thu ngân.",
      data: { order: order[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CREATE POS ORDER ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Lỗi tạo đơn hàng" });
  } finally {
    session.endSession();
  }
};

// ============================================
// 2. DANH SÁCH ĐƠN CHỜ THANH TOÁN (CASHIER)
// ============================================
export const getPendingOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = { orderSource: "IN_STORE", status: "PENDING_PAYMENT" };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("posInfo.staffId", "fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
        },
      },
    });
  } catch (error) {
    console.error("GET PENDING ORDERS ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ============================================
// 3. XỬ LÝ THANH TOÁN (CASHIER)
// ============================================
export const processPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentReceived } = req.body;

    if (!paymentReceived || paymentReceived < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số tiền thanh toán không hợp lệ" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Đơn hàng không ở trạng thái chờ thanh toán",
        });
    }

    if (paymentReceived < order.totalAmount) {
      return res
        .status(400)
        .json({ success: false, message: "Số tiền thanh toán không đủ" });
    }

    const changeGiven = paymentReceived - order.totalAmount;

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const lastInvoice = await Order.findOne({
      "paymentInfo.invoiceNumber": new RegExp(`^INV${year}${month}`),
    }).sort({ "paymentInfo.invoiceNumber": -1 });

    let seq = 1;
    if (lastInvoice?.paymentInfo?.invoiceNumber) {
      const lastSeq = parseInt(lastInvoice.paymentInfo.invoiceNumber.slice(-6));
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const invoiceNumber = `INV${year}${month}${seq
      .toString()
      .padStart(6, "0")}`;

    order.paymentStatus = "PAID";
    order.status = "DELIVERED";

    if (!order.posInfo) {
      order.posInfo = {};
    }
    order.posInfo.cashierId = req.user._id;
    order.posInfo.cashierName = req.user.fullName;
    order.posInfo.paymentReceived = paymentReceived;
    order.posInfo.changeGiven = changeGiven;

    order.paymentInfo = {
      processedBy: req.user._id,
      processedAt: new Date(),
      paymentReceived,
      changeGiven,
      invoiceNumber,
    };

    order.statusHistory.push({
      status: "DELIVERED",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      note: `Đã thanh toán - Hóa đơn ${invoiceNumber} - Thu ngân: ${req.user.fullName}`,
    });

    await order.save();

    res.json({
      success: true,
      message: "Thanh toán thành công!",
      data: { order },
    });
  } catch (error) {
    console.error("PROCESS PAYMENT ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi xử lý thanh toán" });
  }
};

// ============================================
// 4. HỦY ĐƠN CHỜ THANH TOÁN (CASHIER)
// ============================================
export const cancelPendingOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status !== "PENDING_PAYMENT") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          message: "Chỉ hủy được đơn đang chờ thanh toán",
        });
    }

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

    await order.cancel(req.user._id, reason || "Hủy bởi Thu ngân");

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Đã hủy đơn hàng và hoàn kho thành công",
      data: { order },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CANCEL ORDER ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi hủy đơn hàng" });
  } finally {
    session.endSession();
  }
};

// ============================================
// 5. XUẤT HÓA ĐƠN VAT
// ============================================
export const issueVATInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { companyName, taxCode, companyAddress } = req.body;

    if (!companyName || !taxCode) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu thông tin công ty hoặc mã số thuế",
        });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.paymentStatus !== "PAID") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Chỉ xuất hóa đơn cho đơn đã thanh toán",
        });
    }

    if (order.vatInvoice?.invoiceNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Đơn hàng đã có hóa đơn VAT" });
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const lastVAT = await Order.findOne({
      "vatInvoice.invoiceNumber": new RegExp(`^VAT${year}${month}`),
    }).sort({ "vatInvoice.invoiceNumber": -1 });

    let seq = 1;
    if (lastVAT?.vatInvoice?.invoiceNumber) {
      const lastSeq = parseInt(lastVAT.vatInvoice.invoiceNumber.slice(-6));
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    const invoiceNumber = `VAT${year}${month}${seq
      .toString()
      .padStart(6, "0")}`;

    order.vatInvoice = {
      invoiceNumber,
      companyName,
      taxCode,
      companyAddress,
      issuedBy: req.user._id,
      issuedAt: new Date(),
    };

    await order.save();

    res.json({
      success: true,
      message: "Xuất hóa đơn VAT thành công",
      data: { order },
    });
  } catch (error) {
    console.error("ISSUE VAT INVOICE ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi xuất hóa đơn" });
  }
};

// ============================================
// 6. LỊCH SỬ ĐƠN HÀNG POS
// ============================================
export const getPOSOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, search } = req.query;
    const query = { orderSource: "IN_STORE" };

    if (req.user.role === "POS_STAFF") {
      query["posInfo.staffId"] = req.user._id;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate)
        query.createdAt.$gte = new Date(startDate).setHours(0, 0, 0, 0);
      if (endDate)
        query.createdAt.$lte = new Date(endDate).setHours(23, 59, 59, 999);
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "posInfo.receiptNumber": { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("posInfo.staffId", "fullName")
        .populate("items.variantId", "color storage sku images")
        .populate("items.productId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
        },
      },
    });
  } catch (error) {
    console.error("GET POS HISTORY ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi lấy lịch sử đơn hàng" });
  }
};

// ============================================
// ✅ 7. NEW: STATS API FOR CASHIER/ADMIN
// ============================================
export const getPOSStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Base query
    const query = { orderSource: "IN_STORE" };

    // Nếu là Cashier, chỉ lấy đơn của mình xử lý
    if (userRole === "CASHIER") {
      query["posInfo.cashierId"] = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get all orders matching query
    const allOrders = await Order.find(query).lean();

    // Calculate stats
    const stats = {
      totalOrders: allOrders.length,
      totalRevenue: allOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalVATInvoices: allOrders.filter((o) => o.vatInvoice?.invoiceNumber)
        .length,

      // By payment status
      paidOrders: allOrders.filter((o) => o.paymentStatus === "PAID").length,
      unpaidOrders: allOrders.filter((o) => o.paymentStatus === "UNPAID")
        .length,

      // By status
      pendingPayment: allOrders.filter((o) => o.status === "PENDING_PAYMENT")
        .length,
      delivered: allOrders.filter((o) => o.status === "DELIVERED").length,
      cancelled: allOrders.filter((o) => o.status === "CANCELLED").length,

      // Average order value
      avgOrderValue:
        allOrders.length > 0
          ? allOrders.reduce((sum, o) => sum + o.totalAmount, 0) /
            allOrders.length
          : 0,

      // Today's stats
      todayOrders: allOrders.filter((o) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      }).length,

      todayRevenue: allOrders
        .filter((o) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const orderDate = new Date(o.createdAt);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        })
        .reduce((sum, o) => sum + o.totalAmount, 0),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("GET POS STATS ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy thống kê" });
  }
};

export default {
  createPOSOrder,
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
  issueVATInvoice,
  getPOSOrderHistory,
  getPOSStats, // ✅ NEW
};
