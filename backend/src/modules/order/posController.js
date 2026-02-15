// ============================================
// FILE: backend/src/controllers/posController.js
// ✅ ADDED: Stats API for Cashier Dashboard
// ============================================

import mongoose from "mongoose";
import Order, { mapStatusToStage } from "./Order.js";
import User from "../auth/User.js";
import UniversalProduct, {
  UniversalVariant,
} from "../product/UniversalProduct.js";
import Inventory from "../warehouse/Inventory.js";
import WarehouseLocation from "../warehouse/WarehouseLocation.js";
import StockMovement from "../warehouse/StockMovement.js";
import {
  notifyOrderManagerPendingInStoreOrder,
  sendOrderStageNotifications,
} from "../notification/notificationService.js";

const getModelsByType = (productType) => {
  // Unified catalog: all product types now point to Universal models
  return { Product: UniversalProduct, Variant: UniversalVariant };
};

const resolveOrderStage = (order) => {
  return order?.statusStage || mapStatusToStage(order?.status);
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
    const customerPhone = String(customerInfo?.phoneNumber || "").trim();
    const customerName = String(customerInfo?.fullName || "").trim();

    if (!items?.length) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Giỏ hàng trống" });
    }
    if (!customerName || !customerPhone) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin khách hàng" });
    }
    const customer = await User.findOne({
      phoneNumber: customerPhone,
      role: "CUSTOMER",
    }).session(session);

    if (!customer) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "Khach hang chua co tai khoan. Vui long tao tai khoan truoc khi tao don.",
      });
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

      const images = variant.images || product.featuredImages || [];
      const image = images.length > 0 ? images[0] : "";

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productType,
        productName: product.name,
        name: product.name, // Ensure compatible naming
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
        subtotal: itemTotal,
        images: images,
        image: image,
      });
    }

    const receiptNumber = `TMP${Date.now().toString().slice(-8)}`;
    const finalTotal = totalAmount ?? subtotal;

    // Generate Order Number
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const orderNumber = `POS-${datePart}-${Date.now().toString().slice(-6)}${randomPart}`;

    const status = "PENDING_ORDER_MANAGEMENT"; // ✅ NEW STATUS
    const paymentStatus = "UNPAID";
    const paidAt = null;
    const deliveredAt = null;

    const order = (
      await Order.create(
      [
        {
          orderNumber,
          orderSource: "IN_STORE",
          fulfillmentType: "IN_STORE",
            customerId: customer._id,
          items: orderItems,
          shippingAddress: {
              fullName: customerName,
              phoneNumber: customerPhone,
            province: storeLocation || "Cần Thơ",
            ward: "Ninh Kiều",
            detailAddress: "Mua tại cửa hàng",
          },
          paymentMethod: "CASH",
          paymentStatus,
          paidAt,
          status,
          deliveredAt,
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
            paymentReceived: 0,
            changeGiven: 0,
          },
          createdByInfo: {
            userId: req.user._id,
            userName: req.user.fullName,
            userRole: req.user.role,
          },
        },
      ],
      { session }
      )
    )[0];

    order.createdByInfo = {
      userId: req.user._id,
      userName: req.user.fullName || req.user.name,
      userRole: req.user.role
    };
    await order.save({ session });

    await session.commitTransaction();

    await sendOrderStageNotifications({
      order,
      previousStage: "PENDING",
      triggeredBy: req.user?._id,
      source: "create_pos_order",
    });
    // Notification for Order Manager
    await notifyOrderManagerPendingInStoreOrder({ order });

    res.status(201).json({
      success: true,
      message: "Da tao don chuyen kho thanh cong. Don dang cho Order Manager xu ly.",
      data: { order },
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
    const query = {
      orderSource: "IN_STORE",
      $or: [
        { statusStage: "PENDING_PAYMENT" },
        { status: "PENDING_PAYMENT" },
        { status: "PROCESSING" }, // ✅ ADDED: Include paid but not finalized orders
        { status: "PENDING_ORDER_MANAGEMENT" }, // ✅ ADDED: Allow new orders
        { statusStage: "PENDING_ORDER_MANAGEMENT" },
      ],
    };

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

    if (order.orderSource !== "IN_STORE") {
      return res.status(400).json({
        success: false,
        message: "Only in-store POS orders can be paid at cashier",
      });
    }

    const currentStage = resolveOrderStage(order);
    if (
      currentStage !== "PENDING_PAYMENT" &&
      currentStage !== "PENDING_ORDER_MANAGEMENT" && // ✅ ALLOW NEW STATUS
      order.paymentStatus !== "PENDING" &&
      order.paymentStatus !== "UNPAID" // ✅ ALLOW UNPAID
    ) {
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

    order.paymentStatus = "PAID";
    order.status = "PROCESSING"; // ✅ CHANGED: Wait for IMEI update before DELIVERED

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
    };

    order.statusHistory.push({
      status: "PROCESSING",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      note: `Đã thanh toán - Thu ngân: ${req.user.fullName} - Chờ nhập IMEI`,
    });

    await order.save();

    await sendOrderStageNotifications({
      order,
      previousStage: currentStage,
      triggeredBy: req.user?._id,
      source: "pos_process_payment",
    });

    res.json({
      success: true,
      message: "Thanh toán thành công! Vui lòng nhập IMEI để hoàn tất.",
      data: { order },
    });
  } catch (error) {
    console.error("PROCESS PAYMENT ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi xử lý thanh toán" });
  }
};

// ============================================
// 4. HOÀN TẤT ĐƠN HÀNG (NHẬP IMEI & IN HÓA ĐƠN)
// ============================================
export const finalizePOSOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const { items, customerInfo } = req.body;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status !== "PROCESSING" && order.status !== "PENDING_PAYMENT") {
       // Allow finalizing if it's processing or pending payment (if paid via other means?)
       // But strictly for this flow, it should be PROCESSING or PAID.
       if (order.paymentStatus !== "PAID") {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: "Đơn hàng chưa được thanh toán" });
       }
    }

    // Update Items with IMEI
    if (items && items.length > 0) {
      // Create a map for easier lookup
      const itemMap = new Map(items.map(i => [String(i._id) || String(i.variantId), i]));

      for (const orderItem of order.items) {
        // Try to find matching item by specific ID or variantID
        let updateItem = itemMap.get(String(orderItem._id));
        if (!updateItem) updateItem = itemMap.get(String(orderItem.variantId));
        
        if (updateItem) {
          if (updateItem.imei) orderItem.imei = updateItem.imei; // Assuming schema supports it, wait, simple Order items usually don't have IMEI in basic schema?
          // The current schema in Order.js doesn't show IMEI in orderItemSchema!
          // Wait, I need to check if orderItemSchema supports IMEI.
          // Viewing Order.js line 83-144... NO IMEI FIELD!
          // BUT the user script in EditInvoiceDialog uses `item.imei`.
          // If the schema doesn't have it, it won't be saved.
          
          // CRITICAL: Check Order.js schema again. 
          // I see `variantSku`, `variantColor`... but NO `imei`.
          // However, lines 233 in CASHIERDashboard says `${item.imei || "N/A"}`.
          // So maybe it's in `variantId` populate? No, that's stock.
          // Maybe `Order` items should have `imei`.
          
          // Wait, if Order schema doesn't have IMEI, where is it stored?
          // User said: "chưa nhập IMEI máy".
          // In online orders, IMEI is usually selected during fulfillment.
          // Here, we manually enter it. 
          // I MUST ADD IMEI TO ORDER SCHEMA if it's missing.
        }
      }
    }
    
    // Check Order.js for IMEI.
    // It is MISSING.
    // I will need to update Order.js too.

    // Calculate Invoce Number if not exists
    if (!order.paymentInfo || !order.paymentInfo.invoiceNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const lastInvoice = await Order.findOne({
        "paymentInfo.invoiceNumber": new RegExp(`^INV${year}${month}`),
        }).sort({ "paymentInfo.invoiceNumber": -1 }).session(session);

        let seq = 1;
        if (lastInvoice?.paymentInfo?.invoiceNumber) {
        const lastSeq = parseInt(lastInvoice.paymentInfo.invoiceNumber.slice(-6));
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }
        const invoiceNumber = `INV${year}${month}${seq
        .toString()
        .padStart(6, "0")}`;
        
        if (!order.paymentInfo) order.paymentInfo = {};
        order.paymentInfo.invoiceNumber = invoiceNumber;
    }

    order.status = "DELIVERED";
    order.deliveredAt = new Date();
    
    // Update Customer Info if changed
    if (customerInfo) {
        if (customerInfo.name) order.shippingAddress.fullName = customerInfo.name;
        if (customerInfo.phone) order.shippingAddress.phoneNumber = customerInfo.phone;
        // Address update if needed
    }

    order.statusHistory.push({
      status: "DELIVERED",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      note: `Hoàn tất đơn hàng - Hóa đơn ${order.paymentInfo.invoiceNumber}`,
    });

    await order.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: "Đơn hàng đã hoàn tất!",
      data: { order },
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("FINALIZE ORDER ERROR:", error);
    res.status(500).json({ success: false, message: "Lỗi hoàn tất đơn hàng" });
  } finally {
      session.endSession();
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

    if (order.orderSource !== "IN_STORE") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Only in-store POS orders can be canceled at cashier",
      });
    }

    const currentStage = resolveOrderStage(order);
    if (currentStage !== "PENDING_PAYMENT") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          message: "Chỉ hủy được đơn đang chờ thanh toán",
        });
    }

    // Restore warehouse-location inventory for already picked items
    const pickMovements = await StockMovement.find({
      type: "OUTBOUND",
      referenceType: "ORDER",
      referenceId: String(order._id),
    }).session(session);

    const restoreBatches = new Map();
    for (const movement of pickMovements) {
      const locationId = movement.fromLocationId?.toString();
      if (!locationId) continue;

      const key = `${movement.sku}::${locationId}`;
      const prev = restoreBatches.get(key);
      if (prev) {
        prev.quantity += Number(movement.quantity) || 0;
        continue;
      }

      restoreBatches.set(key, {
        sku: movement.sku,
        locationId: movement.fromLocationId,
        locationCode: movement.fromLocationCode,
        productId: movement.productId,
        productName: movement.productName,
        quantity: Number(movement.quantity) || 0,
      });
    }

    for (const batch of restoreBatches.values()) {
      if (!batch.quantity) continue;

      const inventory = await Inventory.findOne({
        sku: batch.sku,
        locationId: batch.locationId,
      }).session(session);

      if (inventory) {
        inventory.quantity += batch.quantity;
        await inventory.save({ session });
      } else {
        await Inventory.create(
          [
            {
              sku: batch.sku,
              productId: batch.productId,
              productName: batch.productName,
              locationId: batch.locationId,
              locationCode: batch.locationCode,
              quantity: batch.quantity,
              status: "GOOD",
            },
          ],
          { session }
        );
      }

      const location = await WarehouseLocation.findById(batch.locationId).session(
        session
      );
      if (location) {
        location.currentLoad += batch.quantity;
        await location.save({ session });
      }

      await StockMovement.create(
        [
          {
            type: "INBOUND",
            sku: batch.sku,
            productId: batch.productId,
            productName: batch.productName,
            toLocationId: batch.locationId,
            toLocationCode: batch.locationCode,
            quantity: batch.quantity,
            referenceType: "ORDER",
            referenceId: String(order._id),
            performedBy: req.user._id,
            performedByName: req.user.fullName || req.user.name || "Cashier",
            notes: "Inventory restored from cashier cancellation",
          },
        ],
        { session }
      );
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

    order.status = "CANCELLED";
    order.cancelledAt = new Date();
    order.cancelReason = reason || "Huy boi Thu ngan";
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: "CANCELLED",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      note: order.cancelReason,
    });
    await order.save({ session });

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
  finalizePOSOrder, // ✅ ADDED
};
