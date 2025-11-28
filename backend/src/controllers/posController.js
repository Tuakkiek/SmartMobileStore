// ============================================
// FILE: backend/src/controllers/posController.js
// ✅ FIXED: Properly track salesCount + stock for POS orders
// ============================================

import mongoose from "mongoose";
import axios from "axios";
import Order from "../models/Order.js";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

// ✅ IMPORT SALES SERVICE
import productSalesService from "../services/productSalesService.js";

// ============================================
// HELPER: Lấy Model theo productType
// ============================================
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
    const { items, customerInfo, storeLocation, totalAmount, promotionCode } =
      req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    if (!customerInfo?.fullName || !customerInfo?.phoneNumber) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin khách hàng",
      });
    }

    console.log("=== CREATING POS ORDER ===");
    console.log("Staff ID:", req.user._id, "| Name:", req.user.fullName);
    console.log("Customer:", customerInfo);
    console.log("Items:", items.length);

    // === VALIDATE & BUILD ORDER ITEMS ===
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

      // Find variant
      const variant = await models.Variant.findById(variantId).session(session);
      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy biến thể (ID: ${variantId})`,
        });
      }

      // Find product
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

      // Check stock
      if (variant.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} (${variant.color}) chỉ còn ${variant.stock} sản phẩm`,
        });
      }

      // ✅ REDUCE STOCK
      variant.stock -= quantity;
      await variant.save({ session });

      // ✅ INCREMENT SALES COUNT FOR VARIANT
      if (variant.incrementSales) {
        await variant.incrementSales(quantity);
      } else {
        variant.salesCount = (variant.salesCount || 0) + quantity;
        await variant.save({ session });
      }

      // ✅ INCREMENT SALES COUNT FOR PRODUCT
      if (product.incrementSales) {
        await product.incrementSales(quantity);
      } else {
        product.salesCount = (product.salesCount || 0) + quantity;
        await product.save({ session });
      }

      console.log(`✅ Updated stock & sales for ${product.name}:`, {
        variantStock: variant.stock,
        variantSales: variant.salesCount,
        productSales: product.salesCount,
      });

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
        variantStorage: variant.storage || "",
        variantConnectivity: variant.connectivity || "",
        variantName: variant.variantName || "",
        variantCpuGpu: variant.cpuGpu || "",
        variantRam: variant.ram || "",
        quantity,
        price: variant.price,
        originalPrice: variant.originalPrice,
        total: itemTotal,
        images: variant.images || [],
      });
    }

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
          console.log("Promotion applied:", promotionDiscount);
        }
      } catch (promoError) {
        console.log("Promotion code invalid or API error:", promoError.message);
      }
    }

    // Tạo số phiếu tạm
    const date = new Date();
    const receiptNumber = `TMP${date.getTime().toString().slice(-8)}`;

    // === TẠO ĐƠN HÀNG ===
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
            // district: "Ninh Kiều",
            // commune: "Xuân Khánh",
            ward: "Ninh Kiều",
            detailAddress: "Mua tại cửa hàng",
          },
          paymentMethod: "CASH",
          paymentStatus: "UNPAID",
          status: "PENDING_PAYMENT",
          subtotal,
          shippingFee: 0,
          promotionDiscount,
          appliedPromotion,
          totalAmount: subtotal - promotionDiscount,
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

    console.log("✅ POS Order created:", order[0].orderNumber);
    console.log("✅ Stock & salesCount updated for all items");

    res.status(201).json({
      success: true,
      message: "Tạo đơn thành công. Vui lòng chuyển cho Thu ngân xử lý.",
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
// LẤY DANH SÁCH ĐƠN CHỜ THANH TOÁN (Thu ngân)
// ============================================
export const getPendingOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      orderSource: "IN_STORE",
      status: "PENDING_PAYMENT",
    };

    const orders = await Order.find(query)
      .populate("posInfo.staffId", "fullName")
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
    console.error("GET PENDING ORDERS ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// XỬ LÝ THANH TOÁN (Thu ngân)
// ============================================
export const processPayment = async (req, res) => {
  // ✅ XÓA session - không dùng transaction ở đây
  try {
    const { orderId } = req.params;
    const { paymentReceived } = req.body;

    if (!paymentReceived || paymentReceived < 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền thanh toán không hợp lệ",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không ở trạng thái chờ thanh toán",
      });
    }

    if (paymentReceived < order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Số tiền thanh toán không đủ",
      });
    }

    const changeGiven = Math.max(0, paymentReceived - order.totalAmount);

    order.posInfo = order.posInfo || {};
    order.posInfo.paymentReceived = paymentReceived;
    order.posInfo.changeGiven = changeGiven;
    order.posInfo.cashierName = req.user.fullName;

    // ✅ TẠO THÔNG TIN THANH TOÁN
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const lastInvoice = await Order.findOne({
      "paymentInfo.invoiceNumber": new RegExp(`^INV${year}${month}`),
    }).sort({ "paymentInfo.invoiceNumber": -1 });

    let sequence = 1;
    if (lastInvoice?.paymentInfo?.invoiceNumber) {
      const lastSeq = parseInt(lastInvoice.paymentInfo.invoiceNumber.slice(-6));
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    const invoiceNumber = `INV${year}${month}${sequence
      .toString()
      .padStart(6, "0")}`;

    order.paymentInfo = {
      processedBy: req.user._id,
      processedAt: new Date(),
      paymentReceived,
      changeGiven,
      invoiceNumber,
    };

    order.paymentStatus = "PAID";
    order.status = "DELIVERED";

    order.statusHistory.push({
      status: "DELIVERED",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      note: `Đã thanh toán - Hóa đơn ${invoiceNumber}`,
    });

    await order.save();

    console.log("✅ Payment processed:", order.orderNumber);

    res.json({
      success: true,
      message: "Thanh toán thành công",
      data: { order },
    });
  } catch (error) {
    console.error("PROCESS PAYMENT ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi thanh toán",
    });
  }
};
// ============================================
// HỦY ĐƠN (Thu ngân) - ✅ FIXED: RESTORE STOCK & SALES
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
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.status !== "PENDING_PAYMENT") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn đang chờ thanh toán",
      });
    }

    // ✅ RESTORE STOCK & DECREMENT SALES COUNT
    for (const item of order.items) {
      const models = getModelsByType(item.productType);
      if (models) {
        const variant = await models.Variant.findById(item.variantId).session(
          session
        );
        if (variant) {
          // Restore stock
          variant.stock += item.quantity;

          // Decrement variant sales
          variant.salesCount = Math.max(
            0,
            (variant.salesCount || 0) - item.quantity
          );
          await variant.save({ session });

          console.log(
            `✅ Restored stock & decremented sales for variant ${variant.sku}:`,
            {
              stock: variant.stock,
              salesCount: variant.salesCount,
            }
          );
        }

        // Decrement product sales
        const product = await models.Product.findById(item.productId).session(
          session
        );
        if (product) {
          product.salesCount = Math.max(
            0,
            (product.salesCount || 0) - item.quantity
          );
          await product.save({ session });

          console.log(`✅ Decremented product sales for ${product.name}:`, {
            salesCount: product.salesCount,
          });
        }
      }
    }

    await order.cancel(req.user._id, reason || "Hủy bởi Thu ngân");

    await session.commitTransaction();

    console.log(
      "✅ Order cancelled and stock/sales restored:",
      order.orderNumber
    );

    res.json({
      success: true,
      message: "Đã hủy đơn hàng và khôi phục kho",
      data: { order },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CANCEL ORDER ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// XUẤT HÓA ĐƠN VAT (Thu ngân)
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

    if (order.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Chỉ xuất cho đơn đã thanh toán",
      });
    }

    if (order.vatInvoice?.invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã có hóa đơn",
      });
    }

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
      message: "Xuất hóa đơn thành công",
      data: { order },
    });
  } catch (error) {
    console.error("ISSUE INVOICE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// LẤY LỊCH SỬ ĐƠN POS (POS Staff / CASHIER / Admin)
// ============================================
export const getPOSOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const query = {
      orderSource: "IN_STORE",
    };

    // CHỈ LỌC staffId NẾU LÀ POS_STAFF
    if (req.user.role === "POS_STAFF") {
      query["posInfo.staffId"] = new mongoose.Types.ObjectId(req.user._id);
    }

    // LỌC THEO NGÀY (00:00 → 23:59:59)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    console.log("POS History Query:", JSON.stringify(query, null, 2));
    console.log("User Role:", req.user.role, "| ID:", req.user._id);

    const orders = await Order.find(query)
      .populate("posInfo.staffId", "fullName")
      .populate({
        path: "items.variantId",
        select: "color storage sku images price",
      })
      .populate({
        path: "items.productId",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    console.log(`Found ${orders.length} orders (Total: ${total})`);

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
    console.error("GET POS ORDER HISTORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch sử đơn hàng",
    });
  }
};

// Export
export default {
  createPOSOrder,
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
  issueVATInvoice,
  getPOSOrderHistory,
};
