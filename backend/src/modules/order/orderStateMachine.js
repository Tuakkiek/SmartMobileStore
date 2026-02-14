import { mapStatusToStage } from "./Order.js";

const MANAGER_ROLES = new Set(["ADMIN"]);
const ORDER_MANAGER_ROLES = new Set(["ORDER_MANAGER"]);
const WAREHOUSE_ROLES = new Set(["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"]);
const SHIPPER_ROLES = new Set(["SHIPPER"]);

const STATUS_ALIASES = Object.freeze({
  NEW: "PENDING",
  PACKING: "PREPARING",
  READY_TO_SHIP: "PREPARING_SHIPMENT",
  IN_TRANSIT: "SHIPPING",
  PICKING: "PROCESSING",
  PICKUP_COMPLETED: "PREPARING_SHIPMENT",
});

const ONLINE_TRANSITIONS = Object.freeze({
  PENDING: ["CONFIRMED", "CANCELLED"],
  PENDING_PAYMENT: ["PENDING", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_CONFIRMED: ["PENDING", "CONFIRMED", "CANCELLED"],
  PAYMENT_VERIFIED: ["PENDING", "CONFIRMED", "CANCELLED"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "PENDING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "CANCELLED"],
  PROCESSING: ["PREPARING", "PREPARING_SHIPMENT", "CANCELLED"],
  PREPARING: ["PREPARING_SHIPMENT", "CANCELLED"],
  PREPARING_SHIPMENT: ["SHIPPING", "CANCELLED"],
  READY_FOR_PICKUP: ["PICKED_UP", "CANCELLED"],
  SHIPPING: ["DELIVERED", "RETURNED", "DELIVERY_FAILED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED", "DELIVERY_FAILED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  PICKED_UP: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  RETURN_REQUESTED: ["RETURNED", "COMPLETED"],
  DELIVERY_FAILED: ["CANCELLED", "RETURNED", "SHIPPING"],
  COMPLETED: [],
  RETURNED: [],
  CANCELLED: [],
});

const IN_STORE_TRANSITIONS = Object.freeze({
  PENDING: ["CONFIRMED", "PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  PROCESSING: ["PREPARING", "PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  PREPARING: ["PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  PREPARING_SHIPMENT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["DELIVERED", "CANCELLED"],
  SHIPPING: ["DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  PICKED_UP: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  RETURN_REQUESTED: ["RETURNED", "COMPLETED"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  COMPLETED: [],
  RETURNED: [],
  CANCELLED: [],
});

export const isInStoreOrder = (order) => {
  return order?.orderSource === "IN_STORE" || order?.fulfillmentType === "IN_STORE";
};

export const normalizeRequestedOrderStatus = (status) => {
  if (!status || typeof status !== "string") {
    return "";
  }

  const trimmed = status.trim().toUpperCase();
  return STATUS_ALIASES[trimmed] || trimmed;
};

const getTransitions = (order) => {
  return isInStoreOrder(order) ? IN_STORE_TRANSITIONS : ONLINE_TRANSITIONS;
};

const isRoleAllowedTarget = (role, targetStatus) => {
  // Picking completion must be confirmed by warehouse manager only.
  if (targetStatus === "PREPARING_SHIPMENT") {
    return ["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"].includes(role);
  }

  if (MANAGER_ROLES.has(role)) {
    return true;
  }

  if (ORDER_MANAGER_ROLES.has(role)) {
    return ["CONFIRMED", "PROCESSING", "SHIPPING", "CANCELLED"].includes(
      targetStatus
    );
  }

  if (WAREHOUSE_ROLES.has(role)) {
    return ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "SHIPPING", "PENDING_PAYMENT", "CANCELLED"].includes(
      targetStatus
    );
  }

  if (SHIPPER_ROLES.has(role)) {
    return ["SHIPPING", "DELIVERED", "RETURNED"].includes(targetStatus);
  }

  return false;
};

export const canTransitionOrderStatus = ({ order, currentStatus, targetStatus, role }) => {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  if (!isRoleAllowedTarget(role, targetStatus)) {
    return {
      allowed: false,
      reason: `Role ${role} is not allowed to set ${targetStatus}`,
    };
  }

  if (MANAGER_ROLES.has(role)) {
    return { allowed: true };
  }

  const transitions = getTransitions(order);
  const allowedTargets = transitions[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${currentStatus} to ${targetStatus}`,
    };
  }

  return { allowed: true };
};

export const getStatusTransitionView = ({ order, currentStatus, targetStatus }) => {
  return {
    currentStatus,
    targetStatus,
    currentStage: order?.statusStage || mapStatusToStage(currentStatus),
    targetStage: mapStatusToStage(targetStatus),
    inStore: isInStoreOrder(order),
  };
};
