import mongoose from "mongoose";
import Order from "./Order.js";
import UniversalProduct, { UniversalVariant } from "../product/UniversalProduct.js";
import Store from "../store/Store.js";
import User from "../auth/User.js";
import Cart from "../cart/Cart.js";
import routingService from "../../services/routingService.js";
import { omniLog } from "../../utils/logger.js";

const ORDER_STATUSES = new Set([
  "PENDING",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PAYMENT_VERIFIED",
  "CONFIRMED",
  "PROCESSING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PREPARING_SHIPMENT",
  "SHIPPING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PICKED_UP",
  "COMPLETED",
  "DELIVERY_FAILED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
]);

const PAYMENT_STATUSES = new Set(["PENDING", "UNPAID", "PAID", "FAILED", "REFUNDED"]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const badRequest = (message) => {
  const error = new Error(message);
  error.httpStatus = 400;
  return error;
};

const normalizeLegacyStatus = (status) => {
  const statusMapping = {
    NEW: "PENDING",
    PACKING: "PREPARING",
    READY_TO_SHIP: "PREPARING_SHIPMENT",
    IN_TRANSIT: "SHIPPING",
    PROCESSING: "PROCESSING",
  };

  return statusMapping[status] || status;
};

const generateOrderNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${datePart}-${Date.now().toString().slice(-6)}${randomPart}`;
};

const generatePickupCode = () => {
  return `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const isOrderOwnedByUser = (order, userId) => {
  const customerId = order?.customerId ? order.customerId.toString() : null;
  const ownerId = order?.userId ? order.userId.toString() : null;
  const requester = userId?.toString();

  return requester && (customerId === requester || ownerId === requester);
};

const normalizeOrderForResponse = (order) => {
  const source = order?.toObject ? order.toObject() : order;
  const items = Array.isArray(source?.items) ? source.items : [];

  const subtotalFromItems = items.reduce((sum, item) => {
    const unitPrice = Number(item?.price) || 0;
    const quantity = Number(item?.quantity) || 0;
    return sum + unitPrice * quantity;
  }, 0);

  const subtotal = toNumber(source?.subtotal, subtotalFromItems);
  const shippingFee = toNumber(source?.shippingFee, 0);
  const discount = toNumber(source?.discount, 0);
  const promotionDiscount = toNumber(source?.promotionDiscount, 0);

  const totalFromFields = subtotal + shippingFee - discount - promotionDiscount;
  const total = toNumber(source?.totalAmount, toNumber(source?.total, totalFromFields));

  return {
    ...source,
    status: normalizeLegacyStatus(source?.status),
    subtotal,
    total: total < 0 ? 0 : total,
    totalAmount: total < 0 ? 0 : total,
    note: source?.note || source?.notes || "",
    notes: source?.notes || source?.note || "",
  };
};

const appendHistory = (order, status, updatedBy, note = "") => {
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  order.statusHistory.push({
    status,
    updatedBy,
    updatedAt: new Date(),
    note,
  });
};

const getOrderSourceFromRequest = (fulfillmentType) => {
  return fulfillmentType === "IN_STORE" ? "IN_STORE" : "ONLINE";
};

const buildProcessedItems = async (rawItems, session) => {
  const processedItems = [];

  for (const rawItem of rawItems) {
    const quantity = toNumber(rawItem?.quantity, 0);
    if (quantity <= 0) {
      throw badRequest("So luong san pham khong hop le");
    }

    let variant = null;
    let product = null;

    if (rawItem?.variantId) {
      variant = await UniversalVariant.findById(rawItem.variantId).session(session);
      if (!variant) {
        throw badRequest(`Khong tim thay bien the: ${rawItem.variantId}`);
      }
    } else if (rawItem?.variantSku) {
      variant = await UniversalVariant.findOne({ sku: rawItem.variantSku }).session(session);
    }

    if (variant) {
      product = await UniversalProduct.findById(variant.productId).session(session);
    }

    if (!product && rawItem?.productId) {
      product = await UniversalProduct.findById(rawItem.productId).session(session);
    }

    if (!product) {
      throw badRequest("Khong tim thay san pham trong don hang");
    }

    if (variant) {
      if (toNumber(variant.stock, 0) < quantity) {
        throw badRequest(`${product.name} chi con ${variant.stock} san pham`);
      }

      variant.stock -= quantity;
      variant.salesCount = toNumber(variant.salesCount, 0) + quantity;
      await variant.save({ session });
    }

    product.salesCount = toNumber(product.salesCount, 0) + quantity;
    await product.save({ session });

    const unitPrice = toNumber(rawItem?.price, variant ? toNumber(variant.price, 0) : 0);
    const originalPrice = toNumber(
      rawItem?.originalPrice,
      variant ? toNumber(variant.originalPrice, unitPrice) : unitPrice
    );

    if (unitPrice < 0) {
      throw badRequest("Gia san pham khong hop le");
    }

    const variantSku = rawItem?.variantSku || variant?.sku;

    processedItems.push({
      productId: product._id,
      variantId: variant?._id,
      productType: rawItem?.productType || "UNIVERSAL",
      variantSku,
      name: rawItem?.name || rawItem?.productName || product.name,
      productName: rawItem?.productName || rawItem?.name || product.name,
      image: rawItem?.image || variant?.images?.[0] || "",
      images: rawItem?.images || variant?.images || [],
      variantColor: rawItem?.variantColor || variant?.color || "",
      variantStorage:
        rawItem?.variantStorage ||
        rawItem?.storage ||
        variant?.attributes?.storage ||
        "",
      variantConnectivity:
        rawItem?.variantConnectivity ||
        rawItem?.connectivity ||
        variant?.attributes?.connectivity ||
        "",
      variantName:
        rawItem?.variantName || rawItem?.name || variant?.variantName || "",
      variantCpuGpu:
        rawItem?.variantCpuGpu || rawItem?.cpuGpu || variant?.attributes?.cpuGpu || "",
      variantRam: rawItem?.variantRam || rawItem?.ram || variant?.attributes?.ram || "",
      price: unitPrice,
      originalPrice,
      quantity,
      subtotal: unitPrice * quantity,
      total: unitPrice * quantity,
    });
  }

  return processedItems;
};

const restoreVariantStock = async (orderItems, session) => {
  for (const item of orderItems) {
    const quantity = toNumber(item?.quantity, 0);
    if (quantity <= 0) {
      continue;
    }

    if (item?.variantId) {
      const variant = await UniversalVariant.findById(item.variantId).session(session);
      if (variant) {
        variant.stock = toNumber(variant.stock, 0) + quantity;
        variant.salesCount = Math.max(0, toNumber(variant.salesCount, 0) - quantity);
        await variant.save({ session });
      }
    }

    if (item?.productId) {
      const product = await UniversalProduct.findById(item.productId).session(session);
      if (product) {
        product.salesCount = Math.max(0, toNumber(product.salesCount, 0) - quantity);
        await product.save({ session });
      }
    }
  }
};

const removeOrderedItemsFromCart = async (customerId, orderItems, session) => {
  if (!customerId) {
    return;
  }

  const cart = await Cart.findOne({ customerId }).session(session);
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return;
  }

  const selectedVariantIds = new Set(
    orderItems
      .map((item) => (item?.variantId ? item.variantId.toString() : null))
      .filter(Boolean)
  );

  if (selectedVariantIds.size === 0) {
    return;
  }

  cart.items = cart.items.filter((item) => {
    const variantId = item?.variantId ? item.variantId.toString() : null;
    return !variantId || !selectedVariantIds.has(variantId);
  });

  await cart.save({ session });
};

const decrementStoreCapacity = async (storeId, session) => {
  if (!storeId) {
    return;
  }

  const store = await Store.findById(storeId).session(session);
  if (!store) {
    return;
  }

  const currentOrders = toNumber(store.capacity?.currentOrders, 0);
  store.capacity.currentOrders = Math.max(0, currentOrders - 1);
  await store.save({ session });
};

const buildFilter = (req) => {
  const {
    status,
    paymentStatus,
    paymentMethod,
    search,
    startDate,
    endDate,
    fulfillmentType,
  } = req.query;

  const andClauses = [];

  if (req.user.role === "CUSTOMER") {
    andClauses.push({
      $or: [{ customerId: req.user._id }, { userId: req.user._id }],
    });
  }

  if (req.user.role === "SHIPPER") {
    andClauses.push({ "shipperInfo.shipperId": req.user._id });
  }

  if (status) {
    andClauses.push({ status: normalizeLegacyStatus(status) });
  }

  if (paymentStatus) {
    andClauses.push({ paymentStatus });
  }

  if (paymentMethod) {
    andClauses.push({ paymentMethod });
  }

  if (fulfillmentType) {
    andClauses.push({ fulfillmentType });
  }

  if (search) {
    andClauses.push({
      $or: [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phoneNumber": { $regex: search, $options: "i" } },
      ],
    });
  }

  if (startDate || endDate) {
    const createdAt = {};
    if (startDate) {
      createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      createdAt.$lte = new Date(endDate);
    }
    andClauses.push({ createdAt });
  }

  if (andClauses.length === 0) {
    return {};
  }

  if (andClauses.length === 1) {
    return andClauses[0];
  }

  return { $and: andClauses };
};

export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = buildFilter(req);
    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "fullName email phoneNumber")
        .populate("userId", "fullName email phoneNumber")
        .populate("shipperInfo.shipperId", "fullName phoneNumber")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    const normalizedOrders = orders.map(normalizeOrderForResponse);

    const payload = {
      orders: normalizedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };

    res.json({
      success: true,
      ...payload,
      data: payload,
    });
  } catch (error) {
    omniLog.error("getAllOrders failed", {
      userId: req.user?._id,
      role: req.user?.role,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Khong the lay danh sach don hang",
      error: error.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "fullName email phoneNumber")
      .populate("userId", "fullName email phoneNumber")
      .populate("shipperInfo.shipperId", "fullName phoneNumber");

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Khong tim thay don hang",
      });
    }

    if (req.user.role === "CUSTOMER" && !isOrderOwnedByUser(order, req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen xem don hang nay",
      });
    }

    if (req.user.role === "SHIPPER") {
      const shipperId = order?.shipperInfo?.shipperId?.toString();
      if (!shipperId || shipperId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Ban khong co quyen xem don hang nay",
        });
      }
    }

    const normalizedOrder = normalizeOrderForResponse(order);

    res.json({
      success: true,
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    omniLog.error("getOrderById failed", {
      orderId: req.params.id,
      userId: req.user?._id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Loi khi lay thong tin don hang",
      error: error.message,
    });
  }
};

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let assignedStore = null;
  let usedStoreRouting = false;

  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      total,
      shippingFee,
      discount,
      notes,
      note,
      fulfillmentType,
      preferredStoreId,
      installmentInfo,
      tradeInInfo,
      promotionCode,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest("Don hang phai co it nhat 1 san pham");
    }

    const effectiveFulfillment =
      fulfillmentType ||
      (req.body?.orderSource === "IN_STORE" ? "IN_STORE" : "HOME_DELIVERY");

    if (effectiveFulfillment !== "IN_STORE") {
      if (!shippingAddress?.fullName || !shippingAddress?.phoneNumber || !shippingAddress?.detailAddress) {
        throw badRequest("Thong tin dia chi giao hang khong day du");
      }
    }

    const processedItems = await buildProcessedItems(items, session);

    const activeStoreCount = await Store.countDocuments({ status: "ACTIVE" }).session(session);
    const canUseStoreRouting = activeStoreCount > 0 && effectiveFulfillment !== "IN_STORE";

    if (canUseStoreRouting) {
      if (effectiveFulfillment === "CLICK_AND_COLLECT") {
        if (preferredStoreId) {
          assignedStore = await Store.findOne({
            _id: preferredStoreId,
            status: "ACTIVE",
            "services.clickAndCollect": true,
          }).session(session);

          if (!assignedStore) {
            const err = new Error("Khong tim thay cua hang nhan hang hop le");
            err.httpStatus = 400;
            throw err;
          }
        } else {
          const nearestStores = await routingService.findNearestStoreWithStock(
            processedItems,
            shippingAddress?.province,
            shippingAddress?.district
          );

          if (!nearestStores.length) {
            const err = new Error("Khong tim thay cua hang co san hang trong khu vuc");
            err.httpStatus = 400;
            throw err;
          }

          assignedStore = await Store.findById(nearestStores[0]._id).session(session);
        }
      } else {
        const routingResult = await routingService.findBestStore(processedItems, shippingAddress || {});

        if (!routingResult.success) {
          const err = new Error(routingResult.message || "Khong tim thay cua hang phu hop");
          err.httpStatus = 400;
          err.payload = { suggestPreOrder: routingResult.suggestPreOrder };
          throw err;
        }

        assignedStore = await Store.findById(routingResult.store._id).session(session);
      }

      await routingService.reserveInventory(assignedStore._id, processedItems, { session });
      usedStoreRouting = true;

      omniLog.info("createOrder: inventory reserved", {
        storeId: assignedStore._id,
        storeCode: assignedStore.code,
        items: processedItems.length,
      });
    }

    const subtotal = processedItems.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity, 1), 0);

    const inferredPromotionDiscount = processedItems.reduce((sum, item) => {
      const originalPrice = toNumber(item.originalPrice, item.price);
      const currentPrice = toNumber(item.price);
      const quantity = toNumber(item.quantity, 1);
      return sum + Math.max(0, originalPrice - currentPrice) * quantity;
    }, 0);

    const tradeInDiscount = toNumber(tradeInInfo?.finalValue, 0);
    const explicitDiscount = toNumber(discount, 0);

    const totalDiscount = Math.max(explicitDiscount, inferredPromotionDiscount) + tradeInDiscount;

    let finalShippingFee = toNumber(shippingFee, 0);

    if (effectiveFulfillment !== "HOME_DELIVERY") {
      finalShippingFee = 0;
    } else if (!shippingFee && assignedStore) {
      const zone = assignedStore.shippingZones?.find(
        (entry) =>
          entry?.province === shippingAddress?.province &&
          entry?.district === shippingAddress?.district
      );
      finalShippingFee = toNumber(zone?.shippingFee, 50000);
    }

    const computedTotal = Math.max(0, subtotal + finalShippingFee - totalDiscount);
    const finalTotal = Number.isFinite(Number(total)) ? Number(total) : computedTotal;

    const orderNumber = generateOrderNumber();
    const isVNPay = paymentMethod === "VNPAY";
    const pickupCode = effectiveFulfillment === "CLICK_AND_COLLECT" ? generatePickupCode() : null;

    const order = new Order({
      userId: req.user._id,
      customerId: req.user._id,
      orderNumber,
      orderSource: getOrderSourceFromRequest(effectiveFulfillment),
      fulfillmentType: effectiveFulfillment,
      items: processedItems,
      shippingAddress,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: "PENDING",
      status: isVNPay ? "PENDING_PAYMENT" : "PENDING",
      subtotal,
      shippingFee: finalShippingFee,
      discount: totalDiscount,
      promotionDiscount: inferredPromotionDiscount,
      total: finalTotal,
      totalAmount: finalTotal,
      notes: notes || note || "",
      note: note || notes || "",
      assignedStore: assignedStore
        ? {
            storeId: assignedStore._id,
            storeName: assignedStore.name,
            storeCode: assignedStore.code,
            storeAddress: `${assignedStore.address?.street || ""}, ${assignedStore.address?.district || ""}, ${assignedStore.address?.province || ""}`,
            storePhone: assignedStore.phone,
            assignedAt: new Date(),
          }
        : undefined,
      pickupInfo:
        effectiveFulfillment === "CLICK_AND_COLLECT"
          ? {
              pickupCode,
              expectedPickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            }
          : undefined,
      installmentInfo,
      tradeInInfo,
      appliedPromotion: promotionCode
        ? {
            code: promotionCode,
            discountAmount: inferredPromotionDiscount,
          }
        : undefined,
    });

    appendHistory(order, order.status, req.user._id, "Order created from checkout");

    await order.save({ session });

    if (assignedStore) {
      assignedStore.capacity.currentOrders = toNumber(assignedStore.capacity?.currentOrders, 0) + 1;
      assignedStore.stats.totalOrders = toNumber(assignedStore.stats?.totalOrders, 0) + 1;
      await assignedStore.save({ session });
    }

    if (!isVNPay) {
      await removeOrderedItemsFromCart(req.user._id, processedItems, session);
    }

    await session.commitTransaction();

    const normalizedOrder = normalizeOrderForResponse(order);

    omniLog.info("createOrder: success", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: req.user._id,
      fulfillmentType: effectiveFulfillment,
      storeId: assignedStore?._id,
      total: normalizedOrder.totalAmount,
      usedStoreRouting,
    });

    res.status(201).json({
      success: true,
      message: "Da tao don hang thanh cong",
      order: normalizedOrder,
      data: { order: normalizedOrder },
      pickupCode,
    });
  } catch (error) {
    await session.abortTransaction();

    omniLog.error("createOrder failed", {
      userId: req.user?._id,
      fulfillmentType: req.body?.fulfillmentType,
      preferredStoreId: req.body?.preferredStoreId,
      usedStoreRouting,
      error: error.message,
    });

    const status = error.httpStatus || 500;

    res.status(status).json({
      success: false,
      message: status === 500 ? "Loi khi tao don hang" : error.message,
      error: error.message,
      ...(error.payload || {}),
    });
  } finally {
    session.endSession();
  }
};

export const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, note, shipperId } = req.body;
    const targetStatus = normalizeLegacyStatus(status);

    if (!ORDER_STATUSES.has(targetStatus)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Trang thai khong hop le",
      });
    }

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Khong tim thay don hang",
      });
    }

    if (req.user.role === "SHIPPER") {
      const assignedShipper = order?.shipperInfo?.shipperId?.toString();
      if (!assignedShipper || assignedShipper !== req.user._id.toString()) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Ban khong duoc cap nhat don hang nay",
        });
      }

      if (!["SHIPPING", "DELIVERED", "RETURNED"].includes(targetStatus)) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Shipper khong duoc cap nhat sang trang thai nay",
        });
      }
    }

    const currentStatus = normalizeLegacyStatus(order.status);

    const transitions = {
      PENDING: ["CONFIRMED", "CANCELLED", "PENDING_PAYMENT", "PAYMENT_CONFIRMED"],
      PENDING_PAYMENT: ["PAYMENT_VERIFIED", "CANCELLED", "PAYMENT_CONFIRMED"],
      PAYMENT_CONFIRMED: ["CONFIRMED", "PROCESSING", "CANCELLED"],
      PAYMENT_VERIFIED: ["CONFIRMED", "PROCESSING", "CANCELLED"],
      CONFIRMED: ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "SHIPPING", "CANCELLED", "READY_FOR_PICKUP"],
      PROCESSING: ["PREPARING", "PREPARING_SHIPMENT", "SHIPPING", "READY_FOR_PICKUP", "CANCELLED"],
      PREPARING: ["SHIPPING", "PREPARING_SHIPMENT", "CANCELLED"],
      PREPARING_SHIPMENT: ["SHIPPING", "OUT_FOR_DELIVERY", "CANCELLED"],
      READY_FOR_PICKUP: ["PICKED_UP", "CANCELLED"],
      SHIPPING: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED", "DELIVERY_FAILED", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED", "DELIVERY_FAILED", "CANCELLED"],
      DELIVERED: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
      PICKED_UP: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
      RETURN_REQUESTED: ["RETURNED", "COMPLETED"],
      DELIVERY_FAILED: ["CANCELLED", "RETURNED", "SHIPPING"],
      COMPLETED: [],
      RETURNED: [],
      CANCELLED: [],
    };

    const sameStatus = currentStatus === targetStatus;
    const allowedTransition = transitions[currentStatus]?.includes(targetStatus);

    if (!sameStatus && !allowedTransition) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Khong the chuyen trang thai tu ${currentStatus} sang ${targetStatus}`,
      });
    }

    if (targetStatus === "SHIPPING" && shipperId) {
      const shipper = await User.findById(shipperId).session(session);
      if (!shipper || shipper.role !== "SHIPPER") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Shipper duoc chon khong hop le",
        });
      }

      order.shipperInfo = {
        shipperId: shipper._id,
        shipperName: shipper.fullName,
        shipperPhone: shipper.phoneNumber,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      };
    }

    order.status = targetStatus;

    if (targetStatus === "CONFIRMED") {
      order.confirmedAt = new Date();
    }

    if (["SHIPPING", "OUT_FOR_DELIVERY"].includes(targetStatus)) {
      order.shippedAt = new Date();
    }

    if (["DELIVERED", "PICKED_UP", "COMPLETED"].includes(targetStatus)) {
      order.deliveredAt = new Date();

      if (order.assignedStore?.storeId && !order.inventoryDeductedAt) {
        await routingService.deductInventory(order.assignedStore.storeId, order.items, {
          session,
        });
        order.inventoryDeductedAt = new Date();
      }

      if (order.assignedStore?.storeId) {
        await decrementStoreCapacity(order.assignedStore.storeId, session);
      }
    }

    if (targetStatus === "CANCELLED") {
      order.cancelledAt = new Date();

      if (order.assignedStore?.storeId) {
        await routingService.releaseInventory(order.assignedStore.storeId, order.items, {
          session,
        });
        await decrementStoreCapacity(order.assignedStore.storeId, session);
      }

      await restoreVariantStock(order.items, session);
    }

    appendHistory(order, targetStatus, req.user._id, note || "Status updated");

    if (note) {
      order.notes = note;
      order.note = note;
    }

    await order.save({ session });
    await session.commitTransaction();

    const normalizedOrder = normalizeOrderForResponse(order);

    omniLog.info("updateOrderStatus: success", {
      orderId: order._id,
      from: currentStatus,
      to: targetStatus,
      userId: req.user._id,
      role: req.user.role,
    });

    res.json({
      success: true,
      message: `Da cap nhat trang thai don hang: ${targetStatus}`,
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    await session.abortTransaction();

    omniLog.error("updateOrderStatus failed", {
      orderId: req.params.id,
      targetStatus: req.body?.status,
      userId: req.user?._id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Loi khi cap nhat trang thai",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!PAYMENT_STATUSES.has(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trang thai thanh toan khong hop le",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Khong tim thay don hang",
      });
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === "PAID") {
      order.paidAt = new Date();
      if (order.status === "PENDING_PAYMENT") {
        order.status = "PAYMENT_VERIFIED";
        appendHistory(order, "PAYMENT_VERIFIED", req.user._id, "Payment marked as paid");
      }
    }

    await order.save();

    const normalizedOrder = normalizeOrderForResponse(order);

    res.json({
      success: true,
      message: `Da cap nhat trang thai thanh toan: ${paymentStatus}`,
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    omniLog.error("updatePaymentStatus failed", {
      orderId: req.params.id,
      paymentStatus: req.body?.paymentStatus,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Loi khi cap nhat trang thai thanh toan",
      error: error.message,
    });
  }
};

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
      Order.countDocuments({
        status: {
          $in: [
            "PENDING",
            "PENDING_PAYMENT",
            "PAYMENT_CONFIRMED",
            "PAYMENT_VERIFIED",
            "CONFIRMED",
            "PROCESSING",
            "PREPARING",
            "PREPARING_SHIPMENT",
            "READY_FOR_PICKUP",
          ],
        },
      }),
      Order.countDocuments({ status: { $in: ["SHIPPING", "OUT_FOR_DELIVERY"] } }),
      Order.countDocuments({ status: { $in: ["DELIVERED", "PICKED_UP", "COMPLETED"] } }),
      Order.countDocuments({ status: { $in: ["CANCELLED", "RETURNED", "DELIVERY_FAILED"] } }),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "PAID",
            status: { $in: ["DELIVERED", "PICKED_UP", "COMPLETED"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
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
      data: {
        stats: {
          totalOrders,
          pendingOrders,
          shippingOrders,
          deliveredOrders,
          cancelledOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    omniLog.error("getOrderStats failed", { error: error.message });

    res.status(500).json({
      success: false,
      message: "Loi khi lay thong ke",
      error: error.message,
    });
  }
};

export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Khong tim thay don hang",
      });
    }

    if (req.user.role === "CUSTOMER" && !isOrderOwnedByUser(order, req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen huy don hang nay",
      });
    }

    const cancellableStatuses = [
      "PENDING",
      "PENDING_PAYMENT",
      "PAYMENT_CONFIRMED",
      "PAYMENT_VERIFIED",
      "CONFIRMED",
      "PROCESSING",
      "PREPARING",
      "PREPARING_SHIPMENT",
      "READY_FOR_PICKUP",
    ];

    if (!cancellableStatuses.includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Khong the huy don hang o trang thai nay",
      });
    }

    if (order.assignedStore?.storeId) {
      await routingService.releaseInventory(order.assignedStore.storeId, order.items, {
        session,
      });
      await decrementStoreCapacity(order.assignedStore.storeId, session);
    }

    await restoreVariantStock(order.items, session);

    order.status = "CANCELLED";
    order.cancelledAt = new Date();
    order.cancelReason = req.body?.cancelReason || req.body?.reason || "Cancelled by user";

    appendHistory(order, "CANCELLED", req.user._id, order.cancelReason);

    await order.save({ session });
    await session.commitTransaction();

    const normalizedOrder = normalizeOrderForResponse(order);

    omniLog.info("cancelOrder: success", {
      orderId: order._id,
      userId: req.user._id,
      reason: order.cancelReason,
    });

    res.json({
      success: true,
      message: "Da huy don hang",
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    await session.abortTransaction();

    omniLog.error("cancelOrder failed", {
      orderId: req.params.id,
      userId: req.user?._id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Loi khi huy don hang",
      error: error.message,
    });
  } finally {
    session.endSession();
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




