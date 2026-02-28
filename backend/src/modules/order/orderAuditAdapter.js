import mongoose from "mongoose";
import Order from "./Order.js";
import { computeAuditDiff } from "../audit/auditDiff.js";

const toStringId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (
    value instanceof mongoose.Types.ObjectId ||
    (typeof value === "object" && typeof value?.toHexString === "function")
  ) {
    return value.toString().trim();
  }
  if (value?._id) return toStringId(value._id);
  return String(value).trim();
};

const toISOStringOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const buildOrderAuditSnapshot = (orderDoc) => {
  if (!orderDoc) {
    return null;
  }

  const source = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  const items = Array.isArray(source.items) ? source.items : [];

  return {
    orderId: toStringId(source._id),
    orderNumber: source.orderNumber || "",
    orderSource: source.orderSource || "",
    fulfillmentType: source.fulfillmentType || "",
    status: source.status || "",
    statusStage: source.statusStage || "",
    paymentMethod: source.paymentMethod || "",
    paymentStatus: source.paymentStatus || "",
    subtotal: Number(source.subtotal || 0),
    shippingFee: Number(source.shippingFee || 0),
    discount: Number(source.discount || 0),
    promotionDiscount: Number(source.promotionDiscount || 0),
    total: Number(source.total || 0),
    totalAmount: Number(source.totalAmount || 0),
    cancelReason: source.cancelReason || "",
    notes: source.notes || "",
    note: source.note || "",
    confirmedAt: toISOStringOrNull(source.confirmedAt),
    shippedAt: toISOStringOrNull(source.shippedAt),
    deliveredAt: toISOStringOrNull(source.deliveredAt),
    cancelledAt: toISOStringOrNull(source.cancelledAt),
    trackingNumber: source.trackingNumber || "",
    shippingProvider: source.shippingProvider || "",
    shippingAddress: source.shippingAddress || {},
    assignedStore: source.assignedStore
      ? {
          storeId: toStringId(source.assignedStore.storeId),
          storeName: source.assignedStore.storeName || "",
          storeCode: source.assignedStore.storeCode || "",
          storePhone: source.assignedStore.storePhone || "",
          assignedBy: toStringId(source.assignedStore.assignedBy),
        }
      : {},
    shipperInfo: source.shipperInfo
      ? {
          shipperId: toStringId(source.shipperInfo.shipperId),
          shipperName: source.shipperInfo.shipperName || "",
          shipperPhone: source.shipperInfo.shipperPhone || "",
          assignedBy: toStringId(source.shipperInfo.assignedBy),
          assignedAt: toISOStringOrNull(source.shipperInfo.assignedAt),
          deliveredAt: toISOStringOrNull(source.shipperInfo.deliveredAt),
        }
      : {},
    pickerInfo: source.pickerInfo
      ? {
          pickerId: toStringId(source.pickerInfo.pickerId),
          pickerName: source.pickerInfo.pickerName || "",
          assignedBy: toStringId(source.pickerInfo.assignedBy),
          assignedAt: toISOStringOrNull(source.pickerInfo.assignedAt),
          pickedAt: toISOStringOrNull(source.pickerInfo.pickedAt),
        }
      : {},
    carrierAssignment: source.carrierAssignment
      ? {
          carrierCode: source.carrierAssignment.carrierCode || "",
          carrierName: source.carrierAssignment.carrierName || "",
          trackingNumber: source.carrierAssignment.trackingNumber || "",
          externalOrderRef: source.carrierAssignment.externalOrderRef || "",
          assignedBy: toStringId(source.carrierAssignment.assignedBy),
          assignedAt: toISOStringOrNull(source.carrierAssignment.assignedAt),
          transferredAt: toISOStringOrNull(source.carrierAssignment.transferredAt),
        }
      : {},
    posInfo: source.posInfo
      ? {
          staffId: toStringId(source.posInfo.staffId),
          cashierId: toStringId(source.posInfo.cashierId),
          paymentReceived: Number(source.posInfo.paymentReceived || 0),
          changeGiven: Number(source.posInfo.changeGiven || 0),
          receiptNumber: source.posInfo.receiptNumber || "",
        }
      : {},
    createdByInfo: source.createdByInfo
      ? {
          userId: toStringId(source.createdByInfo.userId),
          userName: source.createdByInfo.userName || "",
          userRole: source.createdByInfo.userRole || "",
        }
      : {},
    vatInvoice: source.vatInvoice || {},
    onlineInvoice: source.onlineInvoice || {},
    paymentInfo: source.paymentInfo || {},
    items: items.map((item) => ({
      itemId: toStringId(item._id),
      productId: toStringId(item.productId),
      variantId: toStringId(item.variantId),
      variantSku: item.variantSku || "",
      name: item.name || item.productName || "",
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      subtotal: Number(item.subtotal || 0),
      total: Number(item.total || 0),
      imei: item.imei || "",
    })),
  };
};

export const resolveOrderIdFromVnpTxnRef = (txnRef) => {
  const raw = String(txnRef || "").trim();
  if (raw.length < 24) {
    return "";
  }

  const candidate = raw.slice(0, 24);
  return mongoose.Types.ObjectId.isValid(candidate) ? candidate : "";
};

export const resolveOrderIdFromRequest = (req) => {
  const candidates = [
    req?.params?.id,
    req?.params?.orderId,
    req?.body?.orderId,
    req?.query?.orderId,
    resolveOrderIdFromVnpTxnRef(req?.query?.vnp_TxnRef),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (mongoose.Types.ObjectId.isValid(candidate)) {
      return candidate;
    }
  }

  return "";
};

export const resolveOrderIdFromResponseBody = (body) => {
  if (!body || typeof body !== "object") {
    return "";
  }

  const candidates = [
    body.orderId,
    body?.order?._id,
    body?.data?.order?._id,
    body?.data?.orderId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (mongoose.Types.ObjectId.isValid(candidate)) {
      return candidate;
    }
  }

  return "";
};

export const resolveOrderIdFromCarrierPayload = async (payload = {}) => {
  const directId = String(payload?.orderId || "").trim();
  if (directId && mongoose.Types.ObjectId.isValid(directId)) {
    return directId;
  }

  const orderNumber = String(payload?.orderNumber || "").trim();
  const trackingNumber = String(payload?.trackingNumber || "").trim();

  if (!orderNumber && !trackingNumber) {
    return "";
  }

  const query = [];
  if (orderNumber) {
    query.push({ orderNumber });
  }
  if (trackingNumber) {
    query.push({ trackingNumber });
    query.push({ "carrierAssignment.trackingNumber": trackingNumber });
  }

  const order = await Order.findOne({ $or: query }).select("_id").lean();
  return order?._id ? String(order._id) : "";
};

const deriveBranchId = ({ req, beforeOrder, afterOrder } = {}) => {
  const candidates = [
    toStringId(afterOrder?.assignedStore?.storeId),
    toStringId(beforeOrder?.assignedStore?.storeId),
    toStringId(req?.authz?.activeBranchId),
  ];

  for (const candidate of candidates) {
    if (candidate && mongoose.Types.ObjectId.isValid(candidate)) {
      return candidate;
    }
  }

  return null;
};

const deriveActor = ({ req, source = "" } = {}) => {
  if (req?.user?._id) {
    return {
      actorType: "USER",
      userId: toStringId(req.user._id),
      role: req.user?.role || "",
      source: source || "API",
    };
  }

  return {
    actorType: "SYSTEM",
    userId: null,
    role: "SYSTEM",
    source: source || "SYSTEM",
  };
};

const deriveNoteAndReason = ({ req, resBody } = {}) => {
  const note = req?.body?.note || req?.body?.message || resBody?.message || "";
  const reason = req?.body?.reason || req?.body?.cancelReason || "";
  return {
    note: String(note || "").trim(),
    reason: String(reason || "").trim(),
  };
};

const deriveFailureContext = ({ outcome, statusCode, resBody } = {}) => {
  if (outcome !== "FAILED") {
    return {};
  }

  return {
    httpStatus: Number(statusCode) || 500,
    errorCode: String(resBody?.code || "").trim(),
    errorMessage: String(resBody?.message || "").trim(),
  };
};

export const buildOrderAuditPayload = ({
  req,
  actionType,
  outcome,
  source = "",
  orderId = "",
  beforeOrder = null,
  afterOrder = null,
  statusCode = 200,
  resBody = null,
  requestContext = {},
  metadata = {},
} = {}) => {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId || !mongoose.Types.ObjectId.isValid(normalizedOrderId)) {
    return null;
  }

  const beforeSnapshot = buildOrderAuditSnapshot(beforeOrder);
  const afterSnapshot = buildOrderAuditSnapshot(afterOrder);
  const { changedPaths, oldValues, newValues } = computeAuditDiff({
    before: beforeSnapshot || {},
    after: afterSnapshot || {},
  });

  const { note, reason } = deriveNoteAndReason({ req, resBody });
  const failureContext = deriveFailureContext({ outcome, statusCode, resBody });

  return {
    entityType: "ORDER",
    entityId: normalizedOrderId,
    orderId: normalizedOrderId,
    branchId: deriveBranchId({ req, beforeOrder: beforeSnapshot, afterOrder: afterSnapshot }),
    actionType,
    outcome,
    actor: deriveActor({ req, source }),
    changedPaths,
    oldValues,
    newValues,
    note,
    reason,
    requestContext,
    failureContext,
    metadata: {
      ...metadata,
      statusCode,
      orderNumber: afterSnapshot?.orderNumber || beforeSnapshot?.orderNumber || "",
    },
  };
};

export default {
  buildOrderAuditPayload,
  buildOrderAuditSnapshot,
  resolveOrderIdFromRequest,
  resolveOrderIdFromResponseBody,
  resolveOrderIdFromCarrierPayload,
  resolveOrderIdFromVnpTxnRef,
};
