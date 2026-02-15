import Notification from "./Notification.js";
import { mapStatusToStage } from "../order/Order.js";
import { trackOmnichannelEvent } from "../monitoring/omnichannelMonitoringService.js";
import { omniLog } from "../../utils/logger.js";

const STAGE_NOTIFICATION_CONFIG = Object.freeze({
  CONFIRMED: {
    customer: {
      eventType: "ORDER_CONFIRMED",
      title: "Order confirmed",
    },
    warehouse: {
      eventType: "WAREHOUSE_NEW_CONFIRMED_ORDER",
      title: "New confirmed order",
    },
  },
  IN_TRANSIT: {
    customer: {
      eventType: "ORDER_IN_TRANSIT",
      title: "Order in transit",
    },
  },
  DELIVERED: {
    customer: {
      eventType: "ORDER_DELIVERED",
      title: "Order delivered",
    },
  },
});

const isNotificationEnabled = () =>
  String(process.env.ORDER_NOTIFICATIONS_ENABLED ?? "true").toLowerCase() !== "false";
const isReplenishmentNotificationEnabled = () =>
  String(process.env.REPLENISHMENT_NOTIFICATIONS_ENABLED ?? "true").toLowerCase() !==
  "false";

const normalizeStage = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toUpperCase();
  if (normalized.includes("_")) {
    return normalized;
  }

  return mapStatusToStage(normalized);
};

const buildOrderLabel = (order) => {
  if (order?.orderNumber) {
    return order.orderNumber;
  }
  if (order?._id) {
    return String(order._id);
  }
  return "Unknown order";
};

const resolveCustomerRecipient = (order) => {
  const customerId =
    order?.customerId?._id || order?.customerId || order?.userId?._id || order?.userId;
  const shippingAddress = order?.shippingAddress || {};
  return {
    recipientUserId: customerId || undefined,
    metadata: {
      email: shippingAddress.email || undefined,
      phoneNumber: shippingAddress.phoneNumber || undefined,
      fullName: shippingAddress.fullName || undefined,
    },
  };
};

const createCustomerMessage = (stage, orderLabel) => {
  if (stage === "CONFIRMED") {
    return `Your order ${orderLabel} has been confirmed and is being prepared.`;
  }
  if (stage === "IN_TRANSIT") {
    return `Your order ${orderLabel} is in transit.`;
  }
  if (stage === "DELIVERED") {
    return `Your order ${orderLabel} has been delivered.`;
  }
  return `Order ${orderLabel} has a new update.`;
};

const createWarehouseMessage = (orderLabel) => {
  return `Order ${orderLabel} is confirmed and ready for warehouse picking.`;
};

const REPLENISHMENT_DAILY_EVENT_TYPE = "REPLENISHMENT_CRITICAL_DAILY";

const buildReplenishmentMessage = ({ snapshotDateKey, summary = {} }) => {
  const criticalCount = Number(summary.criticalCount) || 0;
  const interStoreCount = Number(summary.interStoreCount) || 0;
  const warehouseCount = Number(summary.warehouseCount) || 0;

  return [
    `Daily replenishment analysis (${snapshotDateKey}) found ${criticalCount} critical items.`,
    `Inter-store: ${interStoreCount}.`,
    `Warehouse replenishment: ${warehouseCount}.`,
  ].join(" ");
};

export const sendOrderStageNotifications = async ({
  order,
  previousStage,
  triggeredBy,
  source = "order_status_update",
} = {}) => {
  if (!isNotificationEnabled()) {
    return [];
  }

  const currentStage = normalizeStage(order?.statusStage || order?.status);
  const previous = normalizeStage(previousStage);
  const stageConfig = STAGE_NOTIFICATION_CONFIG[currentStage];

  if (!order || !currentStage || !stageConfig) {
    return [];
  }

  if (previous && previous === currentStage) {
    return [];
  }

  const orderLabel = buildOrderLabel(order);
  const orderId = order?._id || order?.id;
  const customerRecipient = resolveCustomerRecipient(order);
  const docs = [];

  if (stageConfig.customer) {
    docs.push({
      orderId,
      orderNumber: order?.orderNumber,
      eventType: stageConfig.customer.eventType,
      stage: currentStage,
      recipientType: "CUSTOMER",
      recipientUserId: customerRecipient.recipientUserId,
      channels: ["IN_APP"],
      title: stageConfig.customer.title,
      message: createCustomerMessage(currentStage, orderLabel),
      status: "SENT",
      sentAt: new Date(),
      metadata: {
        source,
        triggeredBy,
        ...customerRecipient.metadata,
      },
    });
  }

  if (stageConfig.warehouse) {
    docs.push({
      orderId,
      orderNumber: order?.orderNumber,
      eventType: stageConfig.warehouse.eventType,
      stage: currentStage,
      recipientType: "WAREHOUSE",
      recipientRole: "WAREHOUSE_MANAGER",
      channels: ["IN_APP"],
      title: stageConfig.warehouse.title,
      message: createWarehouseMessage(orderLabel),
      status: "SENT",
      sentAt: new Date(),
      metadata: {
        source,
        triggeredBy,
      },
    });
  }

  if (!docs.length) {
    return [];
  }

  try {
    const created = await Notification.insertMany(docs, { ordered: false });

    await trackOmnichannelEvent({
      eventType: "ORDER_STAGE_NOTIFICATIONS_SENT",
      operation: "order_notifications",
      level: "INFO",
      success: true,
      orderId,
      orderNumber: order?.orderNumber,
      userId: triggeredBy,
      metadata: {
        source,
        previousStage: previous || null,
        currentStage,
        count: created.length,
      },
    });

    return created;
  } catch (error) {
    omniLog.warn("sendOrderStageNotifications failed", {
      orderId,
      orderNumber: order?.orderNumber,
      currentStage,
      source,
      error: error.message,
    });

    await trackOmnichannelEvent({
      eventType: "ORDER_STAGE_NOTIFICATIONS_FAILED",
      operation: "order_notifications",
      level: "ERROR",
      success: false,
      orderId,
      orderNumber: order?.orderNumber,
      userId: triggeredBy,
      errorMessage: error.message,
      metadata: {
        source,
        previousStage: previous || null,
        currentStage,
      },
    });

    return [];
  }
};

export const sendReplenishmentSummaryNotification = async ({
  snapshotDateKey,
  summary = {},
  recommendations = [],
  source = "replenishment_scheduler",
  triggeredBy = "SYSTEM",
} = {}) => {
  if (!isReplenishmentNotificationEnabled()) {
    return {
      success: true,
      createdCount: 0,
      skipped: true,
      reason: "disabled",
      eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    };
  }

  if (!snapshotDateKey) {
    return {
      success: false,
      createdCount: 0,
      skipped: true,
      reason: "missing_snapshot_date",
      eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    };
  }

  const criticalCount = Number(summary.criticalCount) || 0;
  if (criticalCount <= 0) {
    return {
      success: true,
      createdCount: 0,
      skipped: true,
      reason: "no_critical_recommendations",
      eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    };
  }

  const existing = await Notification.findOne({
    eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    recipientType: "WAREHOUSE",
    recipientRole: "WAREHOUSE_MANAGER",
    "metadata.snapshotDateKey": snapshotDateKey,
  })
    .select("_id")
    .lean();

  if (existing) {
    return {
      success: true,
      createdCount: 0,
      skipped: true,
      reason: "already_sent",
      eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    };
  }

  const preview = (recommendations || [])
    .filter((item) => String(item.priority || "").toUpperCase() === "CRITICAL")
    .slice(0, 10)
    .map((item) => ({
      type: item.type,
      priority: item.priority,
      variantSku: item.variantSku,
      suggestedQuantity: item.suggestedQuantity,
      fromStoreCode: item.fromStore?.storeCode || null,
      toStoreCode: item.toStore?.storeCode || null,
    }));

  const doc = {
    eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    recipientType: "WAREHOUSE",
    recipientRole: "WAREHOUSE_MANAGER",
    channels: ["IN_APP"],
    title: "Critical replenishment recommendations",
    message: buildReplenishmentMessage({ snapshotDateKey, summary }),
    status: "SENT",
    sentAt: new Date(),
    metadata: {
      source,
      triggeredBy,
      snapshotDateKey,
      summary,
      criticalPreview: preview,
    },
  };

  try {
    const created = await Notification.create(doc);

    await trackOmnichannelEvent({
      eventType: "REPLENISHMENT_NOTIFICATIONS_SENT",
      operation: "inventory_replenishment_notifications",
      level: "INFO",
      success: true,
      metadata: {
        source,
        snapshotDateKey,
        criticalCount,
        notificationId: created?._id,
      },
    });

    return {
      success: true,
      createdCount: 1,
      skipped: false,
      reason: "",
      eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
      notificationId: created?._id,
    };
  } catch (error) {
    omniLog.warn("sendReplenishmentSummaryNotification failed", {
      snapshotDateKey,
      source,
      error: error.message,
    });

    await trackOmnichannelEvent({
      eventType: "REPLENISHMENT_NOTIFICATIONS_FAILED",
      operation: "inventory_replenishment_notifications",
      level: "ERROR",
      success: false,
      errorMessage: error.message,
      metadata: {
        source,
        snapshotDateKey,
        criticalCount,
      },
    });

    return {
      success: false,
      createdCount: 0,
      skipped: false,
      reason: "insert_failed",
      eventType: REPLENISHMENT_DAILY_EVENT_TYPE,
    };
  }
};

export const notifyPOSStaffOrderReady = async ({ order, pickerInfo }) => {
  if (!order?.createdByInfo?.userId) {
    return null;
  }

  try {
    const notification = await Notification.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      eventType: "ORDER_READY_FOR_POS",
      stage: "PICKUP_COMPLETED",
      recipientType: "SYSTEM",
      recipientUserId: order.createdByInfo.userId,
      recipientRole: "POS_STAFF",
      channels: ["IN_APP"],
      title: "Order Ready for Customer Handover",
      message: `Order ${order.orderNumber} has been picked and is ready for customer handover`,
      status: "SENT",
      sentAt: new Date(),
      metadata: {
        pickerName: pickerInfo?.pickerName,
        pickerId: pickerInfo?.pickerId,
        orderItems: order.items?.map(item => ({
          productName: item.productName,
          variantSku: item.variantSku,
          quantity: item.quantity,
          image: item.images?.[0]
        }))
      }
    });

    return notification;
  } catch (error) {
    omniLog.error("notifyPOSStaffOrderReady failed", {
      orderId: order._id,
      error: error.message
    });
    return null;
  }
};

export const notifyOrderManagerPendingInStoreOrder = async ({ order }) => {
  if (!order?._id) {
    return null;
  }

  try {
    const notification = await Notification.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      eventType: "IN_STORE_ORDER_PENDING_REVIEW",
      stage: "PENDING",
      recipientType: "SYSTEM",
      recipientRole: "ORDER_MANAGER",
      channels: ["IN_APP"],
      title: "New In-Store Transfer Order",
      message: `Order ${order.orderNumber} is waiting for Order Manager review and warehouse assignment`,
      status: "SENT",
      sentAt: new Date(),
      metadata: {
        orderSource: order.orderSource,
        customerName: order.shippingAddress?.fullName,
        customerPhone: order.shippingAddress?.phoneNumber,
        createdBy: order.createdByInfo?.userName,
      },
    });

    return notification;
  } catch (error) {
    omniLog.error("notifyOrderManagerPendingInStoreOrder failed", {
      orderId: order._id,
      error: error.message,
    });
    return null;
  }
};

export const notifyOrderManagerExchangeRequested = async ({ order, reason }) => {
  if (!order?._id) {
    return null;
  }

  try {
    const notification = await Notification.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      eventType: "IN_STORE_ORDER_EXCHANGE_REQUESTED",
      stage: "CONFIRMED",
      recipientType: "SYSTEM",
      recipientRole: "ORDER_MANAGER",
      channels: ["IN_APP"],
      title: "Device Change Requested",
      message: `Order ${order.orderNumber} has a device change request and must be re-assigned to warehouse`,
      status: "SENT",
      sentAt: new Date(),
      metadata: {
        reason,
        orderSource: order.orderSource,
        createdBy: order.createdByInfo?.userName,
      },
    });

    return notification;
  } catch (error) {
    omniLog.error("notifyOrderManagerExchangeRequested failed", {
      orderId: order._id,
      error: error.message,
    });
    return null;
  }
};

export default {
  sendOrderStageNotifications,
  sendReplenishmentSummaryNotification,
  notifyPOSStaffOrderReady,
  notifyOrderManagerPendingInStoreOrder,
  notifyOrderManagerExchangeRequested,
};
