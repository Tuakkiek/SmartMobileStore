import mongoose from "mongoose";
import axios from "axios";
import Order from "../models/Order.js";
import User from "../models/User.js";
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
// CREATE ORDER - FIXED: LƯU ĐÚNG GIÁ FINAL SAU KHI ÁP MÃ GIẢM GIÁ
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

    // ✅ KIỂM TRA ĐƠN HÀNG VNPAY TRÙNG LẶP - ĐẶT SAU KHI TRÍCH XUẤT paymentMethod
    if (paymentMethod === "VNPAY") {
      const recentOrder = await Order.findOne({
        customerId: req.user._id,
        paymentMethod: "VNPAY",
        status: { $in: ["PENDING_PAYMENT", "PAYMENT_VERIFIED"] },
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      }).session(session);

      if (recentOrder) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message:
            "Bạn có đơn hàng VNPay đang chờ thanh toán. Vui lòng hoàn tất hoặc hủy đơn trước.",
          existingOrderId: recentOrder._id,
        });
      }
    }

    const cart = await Cart.findOne({ customerId: req.user._id }).session(
      session
    );

    console.log("Số lượng sản phẩm trong giỏ hàng:", cart?.items?.length);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    console.log("=== ĐANG TẠO ĐƠN HÀNG ===");
    console.log("Số lượng sản phẩm trong giỏ hàng:", cart.items.length);

    // === KIỂM TRA VÀ ĐIỀU CHỈNH CÁC MẶT HÀNG CỦA ĐƠN ===
    const orderItems = [];
    let subtotal = 0;
    const requestItems = req.body.items || []; // Các mặt hàng từ checkout

    for (const reqItem of requestItems) {
      const variantId = reqItem.variantId;
      const productType = reqItem.productType;
      const quantity = reqItem.quantity;

      // Tìm item trong cart để lấy thông tin bổ sung
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

      console.log("\n--- Processing cart item ---");
      console.log("Cart item:", {
        productId: reqItem.productId?.toString(),
        variantId: variantId?.toString(),
        productType,
      });

      const models = getModelsByType(productType);
      if (!models) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Loại sản phẩm không hợp lệ: ${productType}`,
        });
      }

      // STEP 1: Find variant first
      const variant = await models.Variant.findById(variantId).session(session);
      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy biến thể sản phẩm (Variant ID: ${variantId})`,
        });
      }

      console.log("Found variant:", {
        _id: variant._id?.toString(),
        productId: variant.productId?.toString(),
        sku: variant.sku,
      });

      // STEP 2: Get productId from variant
      const actualProductId = variant.productId;

      if (!actualProductId) {
        await session.abortTransaction();
        return res.status(500).json({
          success: false,
          message: `Biến thể ${variant.sku} không có productId hợp lệ`,
        });
      }

      // STEP 3: Find product
      const product = await models.Product.findById(actualProductId).session(
        session
      );

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm (ID: ${actualProductId})`,
        });
      }

      console.log("Found product:", {
        _id: product._id?.toString(),
        name: product.name,
        status: product.status,
      });

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

      // Cập nhật variant - KHÔNG GỌI incrementSales()
      variant.stock -= reqItem.quantity;
      variant.salesCount = (variant.salesCount || 0) + reqItem.quantity;
      await variant.save({ session });

      // Cập nhật product - CHỈ 1 LẦN
      product.salesCount = (product.salesCount || 0) + reqItem.quantity;
      await product.save({ session });

      console.log(
        `Updated: variant.salesCount=${variant.salesCount}, product.salesCount=${product.salesCount}`
      );

      // SỬA TẠI ĐÂY: DÙNG GIÁ FINAL TỪ FRONTEND (price đã giảm)
      const finalPricePerUnit = reqItem.price; // ← Giá đã giảm
      const originalPricePerUnit = reqItem.originalPrice ?? variant.price; // ← Giá gốc
      const itemTotal = finalPricePerUnit * quantity;
      subtotal += itemTotal;
      // Create order item with correct productId
      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productType: reqItem.productType,
        productName: product.name,
        variantSku: variant.sku,
        variantColor: variant.color,
        variantStorage: variant.storage || variant.variantName,
        variantConnectivity: variant.connectivity,
        variantName: variant.variantName,
        variantCpuGpu: variant.cpuGpu,
        variantRam: variant.ram,
        quantity: quantity,
        price: finalPricePerUnit, // ← Giá hiển thị (đã giảm)
        originalPrice: originalPricePerUnit, // ← Giá gốc (gạch ngang)
        total: itemTotal,
        images: variant.images || [],
      });

      console.log("Item processed successfully");
    }

    console.log("\n=== ORDER ITEMS SUMMARY ===");
    console.log("Total items:", orderItems.length);
    console.log("Subtotal (sau giảm giá):", subtotal);

    // XỬ LÝ PROMOTION CODE (vẫn verify lại cho an toàn)
    let promotionDiscount = 0;
    let appliedPromotion = null;

    if (promotionCode) {
      try {
        const apiUrl = process.env.API_URL || "http://localhost:5000/api";
        const promoResponse = await axios.post(
          `${apiUrl}/promotions/apply`,
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
        console.log("Promotion error:", promoError.message);
        console.log("Promotion response:", promoError.response?.data);
        // Không throw → vẫn cho đặt hàng, chỉ không giảm giá
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

    console.log("\n=== FINAL CALCULATIONS ===");
    console.log("Subtotal:", subtotal);
    console.log("Shipping Fee:", shippingFee);
    console.log("Promotion Discount:", promotionDiscount);
    console.log("Points Used:", pointsUsed);
    console.log("Total Amount:", total);

    // ✅ XÁC ĐỊNH TRẠNG THÁI BAN ĐẦU
    const initialStatus =
      paymentMethod === "VNPAY" ? "PENDING_PAYMENT" : "PENDING";

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
          status: initialStatus, // ✅ ĐÚNG - PENDING_PAYMENT cho VNPay
        },
      ],
      { session }
    );

    // ✅ CHỈ XÓA GIỎ HÀNG KHI KHÔNG PHẢI VNPAY
    if (paymentMethod !== "VNPAY") {
      const checkoutVariantIds = requestItems.map((item) =>
        item.variantId.toString()
      );
      cart.items = cart.items.filter(
        (item) => !checkoutVariantIds.includes(item.variantId.toString())
      );
      await cart.save({ session });
      console.log(
        `✅ Đã xóa ${requestItems.length} sản phẩm khỏi giỏ (${paymentMethod})`
      );
    } else {
      console.log(
        `⏸️ Giữ ${requestItems.length} sản phẩm trong giỏ - Chờ thanh toán VNPay`
      );
    }

    await session.commitTransaction();

    console.log("\nORDER CREATED SUCCESSFULLY:", {
      orderId: order[0]._id,
      orderNumber: order[0].orderNumber,
      status: order[0].status,
      paymentMethod: order[0].paymentMethod,
      totalAmount: order[0].totalAmount,
      itemsCount: order[0].items.length,
    });

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: {
        order: order[0],
        redirectUrl: `/orders/${order[0]._id}`,
        shouldClearCartImmediately: paymentMethod !== "VNPAY", // ✅ THÊM FLAG
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("\nCREATE ORDER ERROR:", {
      message: error.message,
      stack: error.stack,
    });
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
    // ✅ CHO PHÉP HỦY CẢ PENDING VÀ PENDING_PAYMENT
    if (!["PENDING", "PENDING_PAYMENT"].includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn hàng đang chờ xử lý hoặc chờ thanh toán",
      });
    }

    // ✅ THÊM: Nếu là đơn VNPay PENDING_PAYMENT, không cần kiểm tra customerId
    // vì có thể hệ thống tự động hủy
    const isVNPayPending =
      order.paymentMethod === "VNPAY" && order.status === "PENDING_PAYMENT";

    if (
      !isVNPayPending &&
      order.customerId.toString() !== req.user._id.toString()
    ) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
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
    const { status, note, shipperId } = req.body; // ✅ THÊM shipperId
    const userId = req.user._id;
    const userRole = req.user.role;

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
        message: `Không thể chuyển từ "${order.status}" sang "${status}"`,
      });
    }

    // ✅ NEW: Order Manager chỉ định Shipper khi chuyển sang SHIPPING
    if (status === "SHIPPING") {
      if (userRole === "SHIPPER") {
        // Shipper tự nhận đơn
        order.shipperInfo = {
          shipperId: userId,
          shipperName: req.user.fullName,
          shipperPhone: req.user.phoneNumber,
          pickupAt: new Date(),
        };
      } else if (["ORDER_MANAGER", "ADMIN"].includes(userRole)) {
        // Order Manager/Admin chỉ định Shipper
        if (!shipperId) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Vui lòng chỉ định Shipper cho đơn hàng",
          });
        }

        // Kiểm tra Shipper có tồn tại không
        const shipper = await User.findById(shipperId).session(session);
        if (!shipper || shipper.role !== "SHIPPER") {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Shipper không hợp lệ",
          });
        }

        order.shipperInfo = {
          shipperId: shipper._id,
          shipperName: shipper.fullName,
          shipperPhone: shipper.phoneNumber,
          pickupAt: new Date(),
        };
      }
    }

    // ✅ Cập nhật thời gian giao hàng thành công (GIỮ NGUYÊN)
    if (status === "DELIVERED" && order.shipperInfo?.shipperId) {
      order.shipperInfo.deliveredAt = new Date();
      order.shipperInfo.deliveryNote = note || "Giao hàng thành công";
    }

    // ✅ Cập nhật thời gian trả hàng (GIỮ NGUYÊN)
    if (status === "RETURNED" && order.shipperInfo?.shipperId) {
      order.shipperInfo.returnedAt = new Date();
      order.shipperInfo.returnReason = note || "Trả hàng";
    }

    // Hoàn kho khi hủy/trả hàng (GIỮ NGUYÊN)
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

    // Cập nhật thời gian (GIỮ NGUYÊN)
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
      updatedBy: userId,
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
