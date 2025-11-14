// backend/src/controllers/posController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

// Helper: Lấy Model và Variant Model
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
// TẠO ĐƠN HÀNG POS
// ============================================
export const createPOSOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      customerInfo,
      paymentMethod,
      paymentReceived,
      note,
      storeLocation,
    } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    // === VALIDATE & POPULATE ITEMS ===
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { variantId, productType, quantity } = item;

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
          message: `Không tìm thấy biến thể (ID: ${variantId})`,
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
      if (variant.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} (${variant.color}) chỉ còn ${variant.stock} sản phẩm`,
        });
      }

      // Trừ kho
      variant.stock -= quantity;
      await variant.save({ session });

      // Tăng lượt bán
      product.salesCount = (product.salesCount || 0) + quantity;
      await product.save({ session });

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
        quantity,
        price: variant.price,
        originalPrice: variant.originalPrice,
        total: itemTotal,
        images: variant.images || [],
      });
    }

    // Đơn POS không có phí ship
    const shippingFee = 0;
    const totalAmount = subtotal;

    // Tính tiền thối
    const changeGiven = Math.max(0, paymentReceived - totalAmount);

    // Tạo đơn hàng POS
    const order = await Order.create(
      [
        {
          orderType: "POS",
          customerId: req.user._id,
          items: orderItems,
          shippingAddress: {
            fullName: customerInfo?.fullName || "Mua tại cửa hàng",
            phoneNumber: customerInfo?.phoneNumber || "N/A",
            province: storeLocation || "Cần Thơ",
            district: "Ninh Kiều",
            commune: "Xuân Khánh",
            detailAddress: "Showroom Apple Store",
          },
          paymentMethod: paymentMethod || "CASH",
          paymentStatus: "PAID",
          status: "DELIVERED",
          subtotal,
          shippingFee,
          totalAmount,
          note,
          posInfo: {
            cashierId: req.user._id,
            storeLocation: storeLocation || "Apple Store Cần Thơ",
            cashierName: req.user.fullName,
            paymentReceived,
            changeGiven,
            receiptNumber: `RC${Date.now()}`,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Tạo đơn hàng thành công",
      data: { order: order[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CREATE POS ORDER ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo đơn hàng",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// LẤY DANH SÁCH ĐƠN POS
// ============================================
export const getPOSOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const query = { orderType: "POS" };

    // Nếu là POS_STAFF, chỉ xem đơn của mình
    if (req.user.role === "POS_STAFF") {
      query["posInfo.cashierId"] = req.user._id;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate("posInfo.cashierId", "fullName")
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
    console.error("GET POS ORDERS ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// XUẤT HÓA ĐƠN VAT (Chỉ Kế toán)
// ============================================
export const issueVATInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { companyName, taxCode, companyAddress } = req.body;

    if (!companyName || !taxCode) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin công ty hoặc mã số thuế",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.vatInvoice?.invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã có hóa đơn VAT",
      });
    }

    // Tạo số hóa đơn VAT
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    
    const lastInvoice = await Order.findOne({
      "vatInvoice.invoiceNumber": new RegExp(`^VAT${year}${month}`),
    }).sort({ "vatInvoice.invoiceNumber": -1 });

    let sequence = 1;
    if (lastInvoice?.vatInvoice?.invoiceNumber) {
      const lastSeq = parseInt(lastInvoice.vatInvoice.invoiceNumber.slice(-6));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    const invoiceNumber = `VAT${year}${month}${sequence
      .toString()
      .padStart(6, "0")}`;

    // Cập nhật hóa đơn VAT
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
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// BÁO CÁO DOANH THU POS
// ============================================
export const getPOSRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { orderType: "POS", paymentStatus: "PAID" };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const revenue = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    // Doanh thu theo nhân viên
    const staffRevenue = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$posInfo.cashierId",
          cashierName: { $first: "$posInfo.cashierName" },
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        summary: revenue[0] || {
          totalRevenue: 0,
          totalOrders: 0,
          avgOrderValue: 0,
        },
        staffRevenue,
      },
    });
  } catch (error) {
    console.error("GET POS REVENUE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  createPOSOrder,
  getPOSOrders,
  issueVATInvoice,
  getPOSRevenue,
};