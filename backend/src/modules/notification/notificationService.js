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

export default {
  sendOrderStageNotifications,
};
