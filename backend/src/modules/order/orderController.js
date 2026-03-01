import mongoose from "mongoose";
import crypto from "crypto";
import Order, { ORDER_STATUS_STAGES, mapStatusToStage } from "./Order.js";
import UniversalProduct, { UniversalVariant } from "../product/UniversalProduct.js";
import Store from "../store/Store.js";
import User from "../auth/User.js";
import Cart from "../cart/Cart.js";
import Inventory from "../warehouse/Inventory.js";
import WarehouseLocation from "../warehouse/WarehouseLocation.js";
import StockMovement from "../warehouse/StockMovement.js";
import routingService from "../../services/routingService.js";
import { trackOmnichannelEvent } from "../monitoring/omnichannelMonitoringService.js";
import {
  notifyOrderManagerExchangeRequested,
  notifyPOSStaffOrderReady,
  sendOrderStageNotifications,
} from "../notification/notificationService.js";
import { omniLog } from "../../utils/logger.js";
import {
  canTransitionOrderStatus,
  getStatusTransitionView,
  isInStoreOrder,
  normalizeRequestedOrderStatus,
} from "./orderStateMachine.js";

const ORDER_STATUSES = new Set([
  "PENDING",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PAYMENT_VERIFIED",
  "PAYMENT_FAILED",
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
const ORDER_STATUS_STAGES_SET = new Set(ORDER_STATUS_STAGES);

const PAYMENT_STATUSES = new Set(["PENDING", "UNPAID", "PAID", "FAILED", "REFUNDED"]);

const CARRIER_EVENT_ALIASES = Object.freeze({
  SHIPPED: "IN_TRANSIT",
  SHIPPING: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "IN_TRANSIT",
  PICKED_UP: "IN_TRANSIT",
  DELIVERY_SUCCESS: "DELIVERED",
  COMPLETED: "DELIVERED",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  RETURN_TO_SENDER: "RETURNED",
  RETURNED_TO_SENDER: "RETURNED",
  CANCELLED: "CANCELLED",
  CANCELED: "CANCELLED",
});

const CARRIER_EVENT_TO_STATUS = Object.freeze({
  IN_TRANSIT: "SHIPPING",
  DELIVERED: "DELIVERED",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
});

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
  return normalizeRequestedOrderStatus(status);
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

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value?._id) return value._id.toString();
  return value.toString ? value.toString() : String(value);
};

const isOrderOwnedByUser = (order, userId) => {
  const customerId = toIdString(order?.customerId);
  const ownerId = toIdString(order?.userId);
  const requester = toIdString(userId);

  return requester && (customerId === requester || ownerId === requester);
};

const isBranchScopedStaffActor = (req) => {
  return Boolean(req?.authz && !req.authz.isGlobalAdmin && req.authz.requiresBranchAssignment);
};

const enforceInStoreBranchAccess = (req, order) => {
  if (!isInStoreOrder(order) || !isBranchScopedStaffActor(req)) {
    return { allowed: true };
  }

  const activeBranchId = String(req.authz?.activeBranchId || "").trim();
  const orderBranchId = String(order?.assignedStore?.storeId || "").trim();

  if (!orderBranchId) {
    return {
      allowed: false,
      code: "ORDER_BRANCH_MISSING",
      message: "In-store order is missing branch assignment and is blocked by policy",
    };
  }

  if (!activeBranchId || orderBranchId !== activeBranchId) {
    return {
      allowed: false,
      code: "ORDER_BRANCH_FORBIDDEN",
      message: "Order does not belong to your assigned branch",
    };
  }

  return { allowed: true };
};

const normalizeBranchId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (value?._id) return String(value._id).trim();
  return value?.toString ? value.toString().trim() : String(value).trim();
};

const collectActiveBranchIds = (user) => {
  const ids = new Set();
  const assignments = Array.isArray(user?.branchAssignments) ? user.branchAssignments : [];

  for (const assignment of assignments) {
    const status = String(assignment?.status || "ACTIVE").trim().toUpperCase();
    if (status !== "ACTIVE") continue;

    const storeId = normalizeBranchId(assignment?.storeId);
    if (storeId) {
      ids.add(storeId);
    }
  }

  const legacyStoreId = normalizeBranchId(user?.storeLocation);
  if (legacyStoreId) {
    ids.add(legacyStoreId);
  }

  return Array.from(ids);
};

const validateShipperBranchScope = ({ req, order, shipper }) => {
  if (!shipper) return { allowed: true };

  const isGlobalAdmin = Boolean(req?.authz?.isGlobalAdmin || req?.user?.role === "GLOBAL_ADMIN");
  if (isGlobalAdmin) return { allowed: true };

  const activeBranchId = normalizeBranchId(req?.authz?.activeBranchId);
  const orderBranchId = normalizeBranchId(order?.assignedStore?.storeId);
  const requiredBranchId =
    activeBranchId || orderBranchId || normalizeBranchId(req?.user?.storeLocation);

  if (!requiredBranchId) {
    return {
      allowed: false,
      message: "Khong xac dinh duoc chi nhanh hien tai de gan shipper",
    };
  }

  const shipperBranchIds = collectActiveBranchIds(shipper);
  if (shipperBranchIds.length === 0) {
    return {
      allowed: false,
      message: "Shipper chua duoc gan chi nhanh hoat dong",
    };
  }

  if (orderBranchId && !shipperBranchIds.includes(orderBranchId)) {
    return {
      allowed: false,
      message: "Shipper phai thuoc chi nhanh dang xu ly don hang",
    };
  }

  if (!shipperBranchIds.includes(requiredBranchId)) {
    return {
      allowed: false,
      message: "Chi duoc chon shipper cung chi nhanh hien tai",
    };
  }

  return { allowed: true };
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

const enrichOrderImages = (order) => {
  if (!order.items) return order;

  order.items = order.items.map(item => ({
    ...item,
    images: (item.images || []).map(img => {
      if (!img) return null;
      if (img.startsWith("http")) return img;
      if (img.startsWith("/uploads/")) return img;
      if (img.startsWith("uploads/")) return `/${img}`;
      if (img.startsWith("/")) return img;
      return `/uploads/${img}`;
    }).filter(Boolean),
    image: (() => {
      const base = item.image || item.images?.[0] || "";
      if (!base) return "";
      if (base.startsWith("http")) return base;
      if (base.startsWith("/uploads/")) return base;
      if (base.startsWith("uploads/")) return `/${base}`;
      if (base.startsWith("/")) return base;
      return `/uploads/${base}`;
    })(),
  }));

  return order;
};

const appendHistory = (order, status, updatedBy, note = "") => {
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  const latest = order.statusHistory[order.statusHistory.length - 1];
  if (latest?.status === status && latest?.note === note) {
    return;
  }

  order.statusHistory.push({
    status,
    updatedBy,
    updatedAt: new Date(),
    note,
  });
};

const getActorName = (user) => {
  return (
    user?.fullName?.trim() ||
    user?.name?.trim() ||
    user?.email?.trim() ||
    "POS Staff"
  );
};

const restorePickedInventoryForExchange = async ({
  order,
  user,
  session,
  reason = "",
} = {}) => {
  const movements = await StockMovement.find({
    referenceType: "ORDER",
    referenceId: String(order?._id),
  }).session(session);

  if (!movements.length) {
    return [];
  }

  const grouped = new Map();
  for (const movement of movements) {
    const locationId =
      movement.fromLocationId?.toString() || movement.toLocationId?.toString();
    if (!locationId) {
      continue;
    }

    const key = `${movement.sku}::${locationId}`;
    const existing = grouped.get(key) || {
      sku: movement.sku,
      locationId:
        movement.fromLocationId || movement.toLocationId || null,
      locationCode:
        movement.fromLocationCode || movement.toLocationCode || "",
      productId: movement.productId,
      productName: movement.productName,
      outboundQty: 0,
      inboundQty: 0,
    };

    if (movement.type === "OUTBOUND") {
      existing.outboundQty += Number(movement.quantity) || 0;
      if (!existing.locationCode && movement.fromLocationCode) {
        existing.locationCode = movement.fromLocationCode;
      }
    } else if (movement.type === "INBOUND") {
      existing.inboundQty += Number(movement.quantity) || 0;
      if (!existing.locationCode && movement.toLocationCode) {
        existing.locationCode = movement.toLocationCode;
      }
    }

    grouped.set(key, existing);
  }

  const restoredItems = [];

  for (const batch of grouped.values()) {
    const toRestore = Math.max(0, batch.outboundQty - batch.inboundQty);
    if (!toRestore) {
      continue;
    }

    let location = null;
    if (batch.locationId) {
      location = await WarehouseLocation.findById(batch.locationId).session(session);
    }
    if (!location && batch.locationCode) {
      location = await WarehouseLocation.findOne({
        locationCode: batch.locationCode,
      }).session(session);
    }
    if (!location) {
      continue;
    }

    let inventory = await Inventory.findOne({
      sku: batch.sku,
      locationId: location._id,
    }).session(session);

    if (inventory) {
      inventory.quantity = (Number(inventory.quantity) || 0) + toRestore;
      await inventory.save({ session });
    } else {
      await Inventory.create(
        [
          {
            sku: batch.sku,
            productId: batch.productId,
            productName: batch.productName || batch.sku,
            locationId: location._id,
            locationCode: location.locationCode,
            quantity: toRestore,
            status: "GOOD",
          },
        ],
        { session }
      );
    }

    location.currentLoad = (Number(location.currentLoad) || 0) + toRestore;
    await location.save({ session });

    await StockMovement.create(
      [
        {
          type: "INBOUND",
          sku: batch.sku,
          productId: batch.productId,
          productName: batch.productName || batch.sku,
          toLocationId: location._id,
          toLocationCode: location.locationCode,
          quantity: toRestore,
          referenceType: "ORDER",
          referenceId: String(order._id),
          performedBy: user?._id,
          performedByName: getActorName(user),
          notes: `Inventory returned for device change${reason ? `: ${reason}` : ""}`,
        },
      ],
      { session }
    );

    restoredItems.push({
      sku: batch.sku,
      locationCode: location.locationCode,
      quantity: toRestore,
    });
  }

  return restoredItems;
};

const getOrderSourceFromRequest = (fulfillmentType) => {
  return fulfillmentType === "IN_STORE" ? "IN_STORE" : "ONLINE";
};

const normalizeOrderSource = (orderSource) => {
  if (!orderSource || typeof orderSource !== "string") {
    return null;
  }

  const normalized = orderSource.trim().toUpperCase();
  return ["ONLINE", "IN_STORE"].includes(normalized) ? normalized : null;
};

const normalizeFulfillmentType = (fulfillmentType) => {
  if (!fulfillmentType || typeof fulfillmentType !== "string") {
    return null;
  }

  const normalized = fulfillmentType.trim().toUpperCase();
  return ["HOME_DELIVERY", "CLICK_AND_COLLECT", "IN_STORE"].includes(normalized)
    ? normalized
    : null;
};

const normalizeStatusStage = (statusStage) => {
  if (!statusStage || typeof statusStage !== "string") {
    return null;
  }

  const normalized = statusStage.trim().toUpperCase();
  if (ORDER_STATUS_STAGES_SET.has(normalized)) {
    return normalized;
  }

  if (ORDER_STATUSES.has(normalized)) {
    return mapStatusToStage(normalized);
  }

  return null;
};

const normalizeCarrierEventType = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return CARRIER_EVENT_ALIASES[normalized] || normalized;
};

const resolveCarrierTargetStatus = (eventType) => {
  return CARRIER_EVENT_TO_STATUS[eventType] || "";
};

const buildPayloadHash = (payload) => {
  try {
    const text = JSON.stringify(payload ?? {});
    return crypto.createHash("sha256").update(text).digest("hex");
  } catch {
    return "";
  }
};

const parseDateOrNow = (value) => {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const buildProcessedItems = async (rawItems, session) => {
  const processedItems = [];

  for (const rawItem of rawItems) {
    const quantity = toNumber(rawItem?.quantity, 0);
    if (quantity <= 0) {
      throw badRequest("Số lượng sản phẩm không hợp lệ");
    }

    let variant = null;
    let product = null;

    if (rawItem?.variantId) {
      variant = await UniversalVariant.findById(rawItem.variantId).session(session);
      if (!variant) {
        throw badRequest(`Không tìm thấy biến thể: ${rawItem.variantId}`);
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
      throw badRequest("Không tìm thấy sản phẩm trong đơn hàng");
    }

    if (variant) {
      if (toNumber(variant.stock, 0) < quantity) {
        throw badRequest(`${product.name} chỉ còn ${variant.stock} sản phẩm`);
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
      throw badRequest("Giá sản phẩm không hợp lệ");
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
    statusStage,
    paymentStatus,
    paymentMethod,
    search,
    startDate,
    endDate,
    fulfillmentType,
    orderSource,
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

  if (statusStage) {
    const normalizedStage = normalizeStatusStage(statusStage);
    if (!normalizedStage) {
      throw badRequest("Trạng thái giai đoạn không hợp lệ");
    }
    andClauses.push({ statusStage: normalizedStage });
  }

  if (paymentStatus) {
    andClauses.push({ paymentStatus });
  }

  if (paymentMethod) {
    andClauses.push({ paymentMethod });
  }

  if (fulfillmentType) {
    const normalizedFulfillment = normalizeFulfillmentType(fulfillmentType);
    if (!normalizedFulfillment) {
      throw badRequest("Kiểu hoàn tất đơn hàng không hợp lệ");
    }
    andClauses.push({ fulfillmentType: normalizedFulfillment });
  }

  if (orderSource) {
    const normalizedSource = normalizeOrderSource(orderSource);
    if (!normalizedSource) {
      throw badRequest("Nguồn đơn hàng không hợp lệ");
    }
    andClauses.push({ orderSource: normalizedSource });
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

  if (req.user.role === "POS_STAFF") {
    andClauses.push({ orderSource: "IN_STORE" });
    andClauses.push({ "posInfo.staffId": req.user._id });
  }

  if (req.user.role === "CASHIER") {
    andClauses.push({ orderSource: "IN_STORE" });
  }

  // Customer order history must not be scoped by active branch context.
  // Customers should always see all of their own orders.
  if (!req.authz?.isGlobalAdmin && req.user.role !== "CUSTOMER") {
    if (req.authz?.activeBranchId) {
      andClauses.push({ "assignedStore.storeId": req.authz.activeBranchId });
    } else if (req.user.role !== "CUSTOMER") {
      andClauses.push({ "assignedStore.storeId": null });
    }
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

    const normalizedOrders = orders.map(order => enrichOrderImages(normalizeOrderForResponse(order)));

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

    const statusCode = error.httpStatus || 500;
    res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500 ? "Không thể lấy danh sách đơn hàng" : error.message,
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
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const branchDecision = enforceInStoreBranchAccess(req, order);
    if (!branchDecision.allowed) {
      return res.status(403).json({
        success: false,
        code: branchDecision.code,
        message: branchDecision.message,
      });
    }

    if (req.user.role === "CUSTOMER" && !isOrderOwnedByUser(order, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này",
      });
    }

    if (req.user.role === "SHIPPER") {
      const shipperId = order?.shipperInfo?.shipperId?.toString();
      if (!shipperId || shipperId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem đơn hàng này",
        });
      }
    }

    if (req.user.role === "POS_STAFF") {
      const isInStore = isInStoreOrder(order);
      const staffId = order?.posInfo?.staffId?.toString();
      if (!isInStore || !staffId || staffId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem đơn hàng này",
        });
      }
    }

    if (req.user.role === "CASHIER" && !isInStoreOrder(order)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này",
      });
    }

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

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
      message: "Lỗi khi lấy thông tin đơn hàng",
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
      orderSource,
      statusStage,
      preferredStoreId,
      installmentInfo,
      tradeInInfo,
      promotionCode,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest("Đơn hàng phải có ít nhất 1 sản phẩm");
    }

    const normalizedOrderSource = normalizeOrderSource(orderSource);
    if (orderSource && !normalizedOrderSource) {
      throw badRequest("Nguồn đơn hàng không hợp lệ");
    }

    const normalizedFulfillment = normalizeFulfillmentType(fulfillmentType);
    if (fulfillmentType && !normalizedFulfillment) {
      throw badRequest("Kiểu hoàn tất đơn hàng không hợp lệ");
    }

    const effectiveFulfillment =
      normalizedFulfillment || (normalizedOrderSource === "IN_STORE" ? "IN_STORE" : "HOME_DELIVERY");
    const effectiveOrderSource =
      normalizedOrderSource || getOrderSourceFromRequest(effectiveFulfillment);

    if (effectiveOrderSource === "IN_STORE" && effectiveFulfillment !== "IN_STORE") {
      throw badRequest("Đơn IN_STORE phải có fulfillmentType IN_STORE");
    }

    if (effectiveOrderSource === "ONLINE" && effectiveFulfillment === "IN_STORE") {
      throw badRequest("Đơn ONLINE không được có fulfillmentType IN_STORE");
    }

    if (effectiveFulfillment !== "IN_STORE") {
      if (!shippingAddress?.fullName || !shippingAddress?.phoneNumber || !shippingAddress?.detailAddress) {
        throw badRequest("Thông tin địa chỉ giao hàng không đầy đủ");
      }
    }

    const processedItems = await buildProcessedItems(items, session);

    const activeStoreCount = await Store.countDocuments({ status: "ACTIVE" }).session(session);
    // Disable automatic routing for HOME_DELIVERY. Only use routing if preferredStoreId is provided (typically for CLICK_AND_COLLECT)
    const canUseStoreRouting = activeStoreCount > 0 && (effectiveFulfillment === "CLICK_AND_COLLECT" && preferredStoreId);

    if (canUseStoreRouting) {
      if (effectiveFulfillment === "CLICK_AND_COLLECT") {
        if (preferredStoreId) {
          assignedStore = await Store.findOne({
            _id: preferredStoreId,
            status: "ACTIVE",
            "services.clickAndCollect": true,
          }).session(session);

          if (!assignedStore) {
            const err = new Error("Không tìm thấy cửa hàng nhận hàng hợp lệ");
            err.httpStatus = 400;
            throw err;
          }
        }
      }

      if (assignedStore) {
        await routingService.reserveInventory(assignedStore._id, processedItems, { session });
        usedStoreRouting = true;

        omniLog.info("createOrder: inventory reserved", {
          storeId: assignedStore._id,
          storeCode: assignedStore.code,
          items: processedItems.length,
        });
      }
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
    const deferredPaymentMethods = new Set(["VNPAY", "BANK_TRANSFER"]);
    const isDeferredPayment = deferredPaymentMethods.has(paymentMethod);
    const pickupCode = effectiveFulfillment === "CLICK_AND_COLLECT" ? generatePickupCode() : null;
    const initialStatus = isDeferredPayment ? "PENDING_PAYMENT" : "PENDING";
    const initialStatusStage = mapStatusToStage(initialStatus);
    const requestedStatusStage = normalizeStatusStage(statusStage);

    if (statusStage && !requestedStatusStage) {
      throw badRequest("Trạng thái giai đoạn khởi tạo không hợp lệ");
    }

    if (requestedStatusStage && requestedStatusStage !== initialStatusStage) {
      throw badRequest(
        `statusStage khởi tạo phải là ${initialStatusStage} cho trạng thái ${initialStatus}`
      );
    }

    const order = new Order({
      userId: req.user._id,
      customerId: req.user._id,
      orderNumber,
      orderSource: effectiveOrderSource,
      fulfillmentType: effectiveFulfillment,
      items: processedItems,
      shippingAddress,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: "PENDING",
      status: initialStatus,
      statusStage: initialStatusStage,
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

    await order.save({ session });

    if (assignedStore) {
      assignedStore.capacity.currentOrders = toNumber(assignedStore.capacity?.currentOrders, 0) + 1;
      assignedStore.stats.totalOrders = toNumber(assignedStore.stats?.totalOrders, 0) + 1;
      await assignedStore.save({ session });
    }

    if (!isDeferredPayment) {
      await removeOrderedItemsFromCart(req.user._id, processedItems, session);
    }

    await session.commitTransaction();

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

    omniLog.info("createOrder: success", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: req.user._id,
      fulfillmentType: effectiveFulfillment,
      storeId: assignedStore?._id,
      total: normalizedOrder.totalAmount,
      usedStoreRouting,
    });

    await trackOmnichannelEvent({
      eventType: "CREATE_ORDER_SUCCESS",
      operation: "create_order",
      level: "INFO",
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: req.user?._id,
      fulfillmentType: effectiveFulfillment,
      storeId: assignedStore?._id,
      itemCount: processedItems.length,
      metadata: {
        totalAmount: normalizedOrder.totalAmount,
        usedStoreRouting,
      },
    });

    res.status(201).json({
      success: true,
      message: "Đã tạo đơn hàng thành công",
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

    await trackOmnichannelEvent({
      eventType: "CREATE_ORDER_FAILED",
      operation: "create_order",
      level: "ERROR",
      success: false,
      userId: req.user?._id,
      fulfillmentType: req.body?.fulfillmentType,
      storeId: req.body?.preferredStoreId,
      itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
      httpStatus: status,
      errorMessage: error.message,
      metadata: {
        usedStoreRouting,
      },
    });

    res.status(status).json({
      success: false,
      message: status === 500 ? "Lỗi khi tạo đơn hàng" : error.message,
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
    const { status, note, shipperId, assignedStoreId } = req.body;
    const targetStatus = normalizeRequestedOrderStatus(status);
    const isManagerRole = ["ADMIN", "ORDER_MANAGER"].includes(req.user.role);
    const canAssignCarrier = ["ADMIN", "ORDER_MANAGER"].includes(
      req.user.role
    );
    let exchangeRequested = false;
    let exchangeReason = "";

    if (!ORDER_STATUSES.has(targetStatus)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const branchDecision = enforceInStoreBranchAccess(req, order);
    if (!branchDecision.allowed) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        code: branchDecision.code,
        message: branchDecision.message,
      });
    }

    if (req.user.role === "SHIPPER") {
      const assignedShipper = order?.shipperInfo?.shipperId?.toString();
      if (!assignedShipper || assignedShipper !== req.user._id.toString()) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Bạn không được cập nhật đơn hàng này",
        });
      }

      if (!["SHIPPING", "DELIVERED", "RETURNED"].includes(targetStatus)) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Shipper không được cập nhật sang trạng thái này",
        });
      }
    }

    const currentStatus = normalizeLegacyStatus(order.status);
    const inStoreOrder = isInStoreOrder(order);

    if (req.user.role === "POS_STAFF") {
      const creatorId = order?.createdByInfo?.userId?.toString();
      const canHandleOwnInStoreOrder =
        inStoreOrder && creatorId && creatorId === req.user._id.toString();
      const validHandoverAction =
        currentStatus === "PREPARING_SHIPMENT" &&
        ["PENDING_PAYMENT", "CONFIRMED"].includes(targetStatus);

      if (!canHandleOwnInStoreOrder) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "POS staff chỉ được xử lý đơn tại quầy do chính mình tạo",
        });
      }

      if (!validHandoverAction) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message:
            "POS staff chỉ được xác nhận bàn giao hoặc yêu cầu đổi máy tại bước bàn giao",
        });
      }
    }

    const transitionCheck = canTransitionOrderStatus({
      order,
      currentStatus,
      targetStatus,
      role: req.user.role,
    });
    const transitionView = getStatusTransitionView({
      order,
      currentStatus,
      targetStatus,
    });

    if (!transitionCheck.allowed) {
      await session.abortTransaction();
      return res.status(transitionCheck.reason?.startsWith("Role") ? 403 : 400).json({
        success: false,
        message: transitionCheck.reason || "Không thể chuyển trạng thái",
      });
    }

    if (
      (targetStatus === "PROCESSING" || targetStatus === "PREPARING") &&
      req.body.pickerId
    ) {
      // Allow assigning picker during status update
      const picker = await User.findById(req.body.pickerId).session(session);
      const isAllowedPickerRole = inStoreOrder
        ? picker?.role === "WAREHOUSE_MANAGER"
        : ["WAREHOUSE_STAFF", "WAREHOUSE_MANAGER"].includes(picker?.role);

      if (picker && isAllowedPickerRole) {
        order.pickerInfo = {
          pickerId: picker._id,
          pickerName: picker.fullName,
          assignedAt: new Date(),
          assignedBy: req.user._id,
          note: req.body.note || "",
        };
      } else if (req.body.pickerId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: inStoreOrder
            ? "Đơn IN_STORE phải được giao cho WAREHOUSE_MANAGER"
            : "Nhân viên kho được chọn không hợp lệ",
        });
      }
    }

    if (
      req.user.role === "ORDER_MANAGER" &&
      !["CONFIRMED", "PROCESSING", "SHIPPING", "CANCELLED"].includes(
        targetStatus
      )
    ) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message:
          "ORDER_MANAGER chỉ được điều phối đơn sang trạng thái Xác nhận, Lấy hàng, Đang giao hoặc Hủy",
      });
    }

    if (
      inStoreOrder &&
      req.user.role === "ORDER_MANAGER" &&
      ["PROCESSING", "PREPARING"].includes(targetStatus) &&
      !order?.pickerInfo?.pickerId
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vui lòng chỉ định WAREHOUSE_MANAGER trước khi đưa đơn vào lấy hàng",
      });
    }

    if (targetStatus === "PREPARING_SHIPMENT") {
      if (inStoreOrder) {
        if (req.user.role !== "WAREHOUSE_MANAGER") {
          await session.abortTransaction();
          return res.status(403).json({
            success: false,
            message: "Chỉ WAREHOUSE_MANAGER được xác nhận sẵn sàng bàn giao đơn IN_STORE",
          });
        }

        const assignedPickerId = order?.pickerInfo?.pickerId?.toString();
        if (assignedPickerId && assignedPickerId !== req.user._id.toString()) {
          await session.abortTransaction();
          return res.status(403).json({
            success: false,
            message: "Đơn hàng này được phân công cho Warehouse Manager khác",
          });
        }
      } else if (!["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"].includes(req.user.role)) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Chỉ WAREHOUSE_MANAGER hoặc WAREHOUSE_STAFF mới được xác nhận hoàn tất lấy hàng",
        });
      }
    }

    if (targetStatus === "PENDING_PAYMENT" && !inStoreOrder && !isManagerRole) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Chỉ đơn hàng tại cửa hàng mới được chuyển sang chờ thanh toán",
      });
    }

    if (shipperId && !canAssignCarrier) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Chỉ ORDER_MANAGER hoặc ADMIN mới được giao shipper",
      });
    }

    if (shipperId) {
      const shipper = await User.findById(shipperId).session(session);
      if (!shipper || shipper.role !== "SHIPPER") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Shipper được chọn không hợp lệ",
        });
      }

      const shipperBranchDecision = validateShipperBranchScope({ req, order, shipper });
      if (!shipperBranchDecision.allowed) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: shipperBranchDecision.message,
        });
      }

      order.shipperInfo = {
        ...order.shipperInfo,
        shipperId: shipper._id,
        shipperName: shipper.fullName,
        shipperPhone: shipper.phoneNumber,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      };
    }

    // Handle manual store assignment
    if (assignedStoreId) {
      if (!isManagerRole) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Chỉ ORDER_MANAGER hoặc ADMIN mới được gán chi nhánh",
        });
      }

      if (order.assignedStore?.storeId) {
        // If already assigned, check if we're swapping
        if (order.assignedStore.storeId.toString() !== assignedStoreId) {
          omniLog.info("updateOrderStatus: swapping assigned store", {
            orderId: order._id,
            from: order.assignedStore.storeId,
            to: assignedStoreId,
          });

          await routingService.releaseInventory(order.assignedStore.storeId, order.items, { session });
          await decrementStoreCapacity(order.assignedStore.storeId, session);
        }
      }

      const store = await Store.findById(assignedStoreId).session(session);
      if (!store || store.status !== "ACTIVE") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Chi nhánh được chọn không hợp lệ hoặc đang ngừng hoạt động",
        });
      }

      // Reserve inventory at the new store
      await routingService.reserveInventory(store._id, order.items, { session });

      order.assignedStore = {
        storeId: store._id,
        storeName: store.name,
        storeCode: store.code,
        storeAddress: `${store.address?.street || ""}, ${store.address?.district || ""}, ${store.address?.province || ""}`,
        storePhone: store.phone,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      };

      store.capacity.currentOrders = toNumber(store.capacity?.currentOrders, 0) + 1;
      store.stats.totalOrders = toNumber(store.stats?.totalOrders, 0) + 1;
      await store.save({ session });

      omniLog.info("updateOrderStatus: store assigned manually", {
        orderId: order._id,
        storeId: store._id,
        storeCode: store.code,
      });
    }

    if (["PROCESSING", "PREPARING", "SHIPPING"].includes(targetStatus)) {
      if (!order.assignedStore?.storeId && !assignedStoreId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Vui lòng gán chi nhánh trước khi chuyển sang trạng thái này",
        });
      }
    }

    if (targetStatus === "SHIPPING") {
      const requiresShipper = !inStoreOrder;
      const hasAssignedShipper = Boolean(order?.shipperInfo?.shipperId);
      const hasCarrierAssignment = Boolean(
        order?.carrierAssignment?.trackingNumber ||
          order?.carrierAssignment?.carrierCode ||
          order?.carrierAssignment?.carrierName
      );

      if (requiresShipper && !hasAssignedShipper && !hasCarrierAssignment) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn shipper hoặc gán carrier trước khi chuyển sang đang giao",
        });
      }
    }

    if (
      inStoreOrder &&
      req.user.role === "POS_STAFF" &&
      currentStatus === "PREPARING_SHIPMENT" &&
      targetStatus === "CONFIRMED"
    ) {
      exchangeRequested = true;
      exchangeReason = (note || req.body.reason || "Device change requested").trim();
      const restoredItems = await restorePickedInventoryForExchange({
        order,
        user: req.user,
        session,
        reason: exchangeReason,
      });

      if (!Array.isArray(order.exchangeHistory)) {
        order.exchangeHistory = [];
      }
      order.exchangeHistory.push({
        requestedAt: new Date(),
        requestedBy: req.user._id,
        requestedByName: getActorName(req.user),
        reason: exchangeReason,
        previousStatus: currentStatus,
        nextStatus: targetStatus,
        restoredItems,
      });

      if (order.pickerInfo) {
        order.pickerInfo.pickedAt = null;
        order.pickerInfo.note = exchangeReason;
      }
    }

    order.status = targetStatus;

    if (targetStatus === "CONFIRMED") {
      order.confirmedAt = new Date();
    }

    if (targetStatus === "SHIPPING") {
      order.shippedAt = new Date();
    }

    if (targetStatus === "PREPARING_SHIPMENT") {
      order.pickerInfo = {
        ...order.pickerInfo,
        pickerId: order.pickerInfo?.pickerId || req.user._id,
        pickerName:
          order.pickerInfo?.pickerName || req.user.fullName || req.user.name,
        pickedAt: new Date(),
        note: note || order.pickerInfo?.note || "",
      };
    }

    if (["DELIVERED", "PICKED_UP", "COMPLETED"].includes(targetStatus)) {
      order.deliveredAt = new Date();
      if (order.shipperInfo) {
        order.shipperInfo.deliveredAt = new Date();
        if (note) {
          order.shipperInfo.deliveryNote = note;
        }
      }

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

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

    omniLog.info("updateOrderStatus: success", {
      orderId: order._id,
      from: currentStatus,
      to: targetStatus,
      stage: transitionView,
      userId: req.user._id,
      role: req.user.role,
    });

    await sendOrderStageNotifications({
      order: normalizedOrder,
      previousStage: transitionView.currentStage,
      triggeredBy: req.user?._id,
      source: "update_order_status",
    });

    if (
      req.body.notifyPOS &&
      targetStatus === "PREPARING_SHIPMENT" &&
      order.createdByInfo?.userId
    ) {
      await notifyPOSStaffOrderReady({
        order,
        pickerInfo: order.pickerInfo
      });
    }

    if (exchangeRequested) {
      await notifyOrderManagerExchangeRequested({
        order,
        reason: exchangeReason,
      });
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng: ${targetStatus}`,
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
      message: "Lỗi khi cập nhật trạng thái",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const assignCarrier = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      shipperId,
      carrierCode,
      carrierName,
      trackingNumber,
      externalOrderRef,
      note,
    } = req.body;

    const normalizedTrackingNumber =
      typeof trackingNumber === "string" ? trackingNumber.trim() : "";
    const normalizedCarrierCode =
      typeof carrierCode === "string" && carrierCode.trim()
        ? carrierCode.trim().toUpperCase()
        : "";
    const normalizedCarrierName =
      typeof carrierName === "string" ? carrierName.trim() : "";

    if (!shipperId && !normalizedTrackingNumber && !normalizedCarrierCode && !normalizedCarrierName) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp shipper hoặc thông tin carrier",
      });
    }

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (isInStoreOrder(order)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng tại cửa hàng không cần gán shipper",
      });
    }

    let shipper = null;
    if (shipperId) {
      shipper = await User.findById(shipperId).session(session);
      if (!shipper || shipper.role !== "SHIPPER") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Shipper được chọn không hợp lệ",
        });
      }
    }

    if (shipper) {
      const shipperBranchDecision = validateShipperBranchScope({ req, order, shipper });
      if (!shipperBranchDecision.allowed) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: shipperBranchDecision.message,
        });
      }
    }

    const previousShipperId = order?.shipperInfo?.shipperId?.toString() || null;
    const previousAssignment = order.carrierAssignment || {};
    const previousCarrierSnapshot = {
      shipperId: previousShipperId,
      carrierCode: previousAssignment.carrierCode || "",
      carrierName: previousAssignment.carrierName || "",
      trackingNumber: previousAssignment.trackingNumber || order.trackingNumber || "",
      externalOrderRef: previousAssignment.externalOrderRef || "",
    };

    if (shipper) {
      order.shipperInfo = {
        ...order.shipperInfo,
        shipperId: shipper._id,
        shipperName: shipper.fullName,
        shipperPhone: shipper.phoneNumber,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      };
    }

    const resolvedCarrierName =
      normalizedCarrierName || shipper?.fullName || previousAssignment.carrierName || "";

    const nextAssignment = {
      ...previousAssignment,
      carrierCode: normalizedCarrierCode || previousAssignment.carrierCode || "",
      carrierName: resolvedCarrierName,
      trackingNumber:
        normalizedTrackingNumber || previousAssignment.trackingNumber || order.trackingNumber || "",
      externalOrderRef:
        typeof externalOrderRef === "string" && externalOrderRef.trim()
          ? externalOrderRef.trim()
          : previousAssignment.externalOrderRef || "",
      assignedAt: new Date(),
      assignedBy: req.user._id,
      note: note || previousAssignment.note || "",
    };

    const hasPreviousAssignment = Boolean(
      previousCarrierSnapshot.shipperId ||
        previousCarrierSnapshot.carrierCode ||
        previousCarrierSnapshot.carrierName ||
        previousCarrierSnapshot.trackingNumber
    );

    const shipperChanged = Boolean(
      shipper && previousShipperId && previousShipperId !== shipper._id.toString()
    );

    const carrierChanged =
      previousCarrierSnapshot.carrierCode !== nextAssignment.carrierCode ||
      previousCarrierSnapshot.carrierName !== nextAssignment.carrierName ||
      previousCarrierSnapshot.trackingNumber !== nextAssignment.trackingNumber ||
      previousCarrierSnapshot.externalOrderRef !== nextAssignment.externalOrderRef;

    const changedCarrier = Boolean(shipperChanged || carrierChanged);
    if (changedCarrier && hasPreviousAssignment) {
      nextAssignment.transferredAt = new Date();
    }

    order.carrierAssignment = nextAssignment;

    if (nextAssignment.trackingNumber) {
      order.trackingNumber = nextAssignment.trackingNumber;
    }
    if (nextAssignment.carrierName) {
      order.shippingProvider = nextAssignment.carrierName;
    }

    const statusForHistory = normalizeLegacyStatus(order.status);
    const assigneeName =
      shipper?.fullName ||
      nextAssignment.carrierName ||
      nextAssignment.carrierCode ||
      "carrier";
    const defaultNote = changedCarrier
      ? `Carrier transferred to ${assigneeName}`
      : `Carrier assigned to ${assigneeName}`;

    appendHistory(order, statusForHistory, req.user._id, note || defaultNote);

    await order.save({ session });
    await session.commitTransaction();

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));
    return res.json({
      success: true,
      message: changedCarrier ? "Đã chuyển carrier" : "Đã cập nhật carrier",
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: "Lỗi khi gán shipper",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const handleCarrierWebhook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expectedToken = process.env.CARRIER_WEBHOOK_TOKEN;
    const requestToken = req.headers["x-carrier-token"] || req.headers["x-webhook-token"];

    if (expectedToken && String(requestToken || "") !== String(expectedToken)) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        message: "Unauthorized carrier webhook",
      });
    }

    const {
      eventId,
      eventType,
      status,
      trackingNumber,
      orderNumber,
      orderId,
      carrierCode,
      carrierName,
      note,
      occurredAt,
      proof,
      metadata,
    } = req.body || {};

    const normalizedEventType = normalizeCarrierEventType(eventType || status);
    if (!normalizedEventType) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Missing carrier event type",
      });
    }

    const normalizedTracking =
      typeof trackingNumber === "string" ? trackingNumber.trim() : "";
    const normalizedOrderNumber =
      typeof orderNumber === "string" ? orderNumber.trim() : "";
    const normalizedOrderId =
      typeof orderId === "string" && mongoose.Types.ObjectId.isValid(orderId)
        ? orderId
        : "";
    const normalizedEventId = eventId ? String(eventId).trim() : "";
    const normalizedCarrierCode =
      typeof carrierCode === "string" && carrierCode.trim()
        ? carrierCode.trim().toUpperCase()
        : "";
    const normalizedCarrierName =
      typeof carrierName === "string" ? carrierName.trim() : "";

    if (!normalizedTracking && !normalizedOrderNumber && !normalizedOrderId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Missing order reference (orderId, orderNumber, or trackingNumber)",
      });
    }

    const orderQueries = [];
    if (normalizedOrderId) {
      orderQueries.push({ _id: normalizedOrderId });
    }
    if (normalizedOrderNumber) {
      orderQueries.push({ orderNumber: normalizedOrderNumber });
    }
    if (normalizedTracking) {
      orderQueries.push({ "carrierAssignment.trackingNumber": normalizedTracking });
      orderQueries.push({ trackingNumber: normalizedTracking });
    }

    const order = await Order.findOne({ $or: orderQueries }).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found for carrier webhook",
      });
    }

    if (isInStoreOrder(order)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Carrier webhook is not supported for in-store orders",
      });
    }

    const isDuplicateEvent =
      normalizedEventId &&
      Array.isArray(order.carrierWebhookEvents) &&
      order.carrierWebhookEvents.some((entry) => entry?.eventId === normalizedEventId);

    if (isDuplicateEvent) {
      await session.abortTransaction();
      return res.json({
        success: true,
        duplicated: true,
        message: "Duplicate carrier event ignored",
        orderId: order._id,
        status: order.status,
        statusStage: order.statusStage,
      });
    }

    const currentStatus = normalizeLegacyStatus(order.status);
    const previousStage = order.statusStage || mapStatusToStage(currentStatus);
    const targetStatus = resolveCarrierTargetStatus(normalizedEventType);
    const webhookNote =
      typeof note === "string" && note.trim()
        ? note.trim()
        : `Carrier event ${normalizedEventType}`;
    const eventTime = parseDateOrNow(occurredAt);

    order.carrierAssignment = {
      ...(order.carrierAssignment || {}),
      carrierCode: normalizedCarrierCode || order?.carrierAssignment?.carrierCode || "",
      carrierName: normalizedCarrierName || order?.carrierAssignment?.carrierName || "",
      trackingNumber: normalizedTracking || order?.carrierAssignment?.trackingNumber || "",
      assignedAt: order?.carrierAssignment?.assignedAt || new Date(),
      assignedBy: order?.carrierAssignment?.assignedBy,
      lastWebhookAt: new Date(),
    };

    if (normalizedTracking) {
      order.trackingNumber = normalizedTracking;
    }
    if (order?.carrierAssignment?.carrierName) {
      order.shippingProvider = order.carrierAssignment.carrierName;
    }

    let statusChanged = false;
    if (targetStatus && targetStatus !== currentStatus) {
      order.status = targetStatus;
      appendHistory(order, targetStatus, undefined, webhookNote);
      statusChanged = true;

      if (targetStatus === "SHIPPING") {
        order.shippedAt = order.shippedAt || eventTime;
      }

      if (targetStatus === "DELIVERED") {
        order.deliveredAt = eventTime;
      }

      if (targetStatus === "CANCELLED") {
        order.cancelledAt = eventTime;
        if (!order.cancelReason) {
          order.cancelReason = webhookNote;
        }
      }
    }

    if (proof && typeof proof === "object") {
      const proofPhotos = Array.isArray(proof.photos)
        ? proof.photos
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean)
        : [];

      order.deliveryProof = {
        ...(order.deliveryProof || {}),
        proofType: String(proof.proofType || order?.deliveryProof?.proofType || "PHOTO")
          .trim()
          .toUpperCase(),
        deliveredAt: parseDateOrNow(proof.deliveredAt || order.deliveredAt || occurredAt),
        receivedAt: new Date(),
        signedBy:
          proof.signedBy || proof.receiverName || order?.deliveryProof?.signedBy || "",
        signatureImageUrl:
          proof.signatureImageUrl ||
          proof.signatureUrl ||
          order?.deliveryProof?.signatureImageUrl ||
          "",
        photos: proofPhotos.length ? proofPhotos : order?.deliveryProof?.photos || [],
        geo: {
          lat: Number.isFinite(Number(proof?.geo?.lat))
            ? Number(proof.geo.lat)
            : order?.deliveryProof?.geo?.lat,
          lng: Number.isFinite(Number(proof?.geo?.lng))
            ? Number(proof.geo.lng)
            : order?.deliveryProof?.geo?.lng,
        },
        note: proof.note || webhookNote,
        raw: proof.raw || proof,
      };
    }

    if (!Array.isArray(order.carrierWebhookEvents)) {
      order.carrierWebhookEvents = [];
    }
    order.carrierWebhookEvents.push({
      eventId: normalizedEventId || undefined,
      eventType: normalizedEventType,
      rawStatus: typeof status === "string" ? status.trim().toUpperCase() : undefined,
      mappedStatus: targetStatus || undefined,
      mappedStage: targetStatus ? mapStatusToStage(targetStatus) : undefined,
      occurredAt: eventTime,
      receivedAt: new Date(),
      payloadHash: buildPayloadHash(req.body || {}),
      note: webhookNote,
      payload: {
        carrierCode: normalizedCarrierCode || undefined,
        carrierName: normalizedCarrierName || undefined,
        trackingNumber: normalizedTracking || undefined,
        proof: proof || undefined,
        metadata: metadata || undefined,
      },
    });

    await order.save({ session });
    await session.commitTransaction();

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

    if (statusChanged) {
      await sendOrderStageNotifications({
        order: normalizedOrder,
        previousStage,
        triggeredBy: undefined,
        source: "carrier_webhook",
      });
    }

    return res.json({
      success: true,
      duplicated: false,
      message: "Carrier webhook processed",
      statusChanged,
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    await session.abortTransaction();

    omniLog.error("handleCarrierWebhook failed", {
      error: error.message,
      payload: req.body,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to process carrier webhook",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const assignPicker = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { pickerId, note } = req.body;

    if (!pickerId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn nhân viên kho",
      });
    }

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const picker = await User.findById(pickerId).session(session);
    if (!picker || !["WAREHOUSE_STAFF", "WAREHOUSE_MANAGER"].includes(picker.role)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Nhân viên kho không hợp lệ",
      });
    }

    order.pickerInfo = {
      pickerId: picker._id,
      pickerName: picker.fullName,
      assignedAt: new Date(),
      assignedBy: req.user._id,
      note: note || order.pickerInfo?.note || "",
    };

    // Auto transition to CONFIRMED or PICKING if needed?
    // For now, just assign.

    appendHistory(order, order.status, req.user._id, `Assigned picker: ${picker.fullName}`);

    await order.save({ session });
    await session.commitTransaction();

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));
    res.json({
      success: true,
      message: `Đã phân công nhân viên lấy hàng: ${picker.fullName}`,
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    await session.abortTransaction();
    omniLog.error("assignPicker failed", {
      orderId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Lỗi khi phân công nhân viên lấy hàng",
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
      if (order.status === "PENDING_PAYMENT" && order.orderSource !== "IN_STORE") {
        order.status = "PENDING";
        appendHistory(order, "PENDING", req.user._id, "Payment marked as paid");
      }
    } else if (paymentStatus === "FAILED" && order.orderSource !== "IN_STORE") {
      order.status = "PAYMENT_FAILED";
      order.paymentFailureAt = new Date();
      appendHistory(order, "PAYMENT_FAILED", req.user._id, "Payment marked as failed");
    }

    await order.save();

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái thanh toán: ${paymentStatus}`,
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
      message: "Lỗi khi cập nhật trạng thái thanh toán",
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
      Order.countDocuments({
        status: { $in: ["CANCELLED", "RETURNED", "DELIVERY_FAILED", "PAYMENT_FAILED"] },
      }),
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
      message: "Lỗi khi lấy thống kê",
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
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (req.user.role === "CUSTOMER" && !isOrderOwnedByUser(order, req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
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
        message: "Không thể hủy đơn hàng ở trạng thái này",
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

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

    omniLog.info("cancelOrder: success", {
      orderId: order._id,
      userId: req.user._id,
      reason: order.cancelReason,
    });

    res.json({
      success: true,
      message: "Đã hủy đơn hàng",
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
      message: "Lỗi khi hủy đơn hàng",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};


export const assignStore = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { storeId } = req.body;

    if (!storeId) {
      throw badRequest("Vui lòng chọn chi nhánh");
    }

    const order = await Order.findById(id).session(session);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    const store = await Store.findById(storeId).session(session);
    if (!store) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chi nhánh" });
    }

    // Check if store is different
    const currentStoreId = order.assignedStore?.storeId?.toString();
    if (currentStoreId === storeId) {
      return res.status(400).json({ success: false, message: "Đơn hàng đã được gán cho chi nhánh này" });
    }

    const oldStoreName = order.assignedStore?.storeName || "chưa gán";

    // Release inventory from old branch if exists
    if (order.assignedStore?.storeId) {
      await routingService.releaseInventory(order.assignedStore.storeId, order.items, { session });
      await decrementStoreCapacity(order.assignedStore.storeId, session);
    }

    // Reserve inventory in new branch
    try {
      await routingService.reserveInventory(storeId, order.items, { session });
    } catch (inventoryError) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Chi nhánh mới không đủ hàng: ${inventoryError.message}`,
      });
    }

    // Update branch capacity
    const currentOrders = toNumber(store.capacity?.currentOrders, 0);
    if (!store.capacity) store.capacity = {};
    store.capacity.currentOrders = currentOrders + 1;
    await store.save({ session });

    // Update order
    order.assignedStore = {
      storeId: store._id,
      storeName: store.name,
      storeCode: store.code,
      storeAddress: `${store.address.street}, ${store.address.ward}, ${store.address.district}, ${store.address.province}`,
      storePhone: store.phone,
      assignedAt: new Date(),
      assignedBy: req.user._id,
    };

    appendHistory(order, order.status, req.user._id, `Chuyển đơn từ ${oldStoreName} sang ${store.name}`);

    await order.save({ session });
    await session.commitTransaction();

    const normalizedOrder = enrichOrderImages(normalizeOrderForResponse(order));

    res.json({
      success: true,
      message: `Đã chuyển đơn sang chi nhánh ${store.name}`,
      order: normalizedOrder,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    await session.abortTransaction();
    omniLog.error("assignStore failed", { orderId: req.params.id, error: error.message });
    res.status(500).json({ success: false, message: "Lỗi khi chuyển chi nhánh", error: error.message });
  } finally {
    session.endSession();
  }
};

export default {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  assignCarrier,
  handleCarrierWebhook,
  updatePaymentStatus,
  getOrderStats,
  cancelOrder,
  assignStore,
};
