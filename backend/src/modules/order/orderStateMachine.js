import { mapStatusToStage } from "./Order.js";

const MANAGER_ROLES = new Set(["ADMIN", "GLOBAL_ADMIN"]);
const ORDER_MANAGER_ROLES = new Set(["ORDER_MANAGER"]);
const WAREHOUSE_ROLES = new Set(["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"]);
const SHIPPER_ROLES = new Set(["SHIPPER"]);
const POS_ROLES = new Set(["POS_STAFF"]);

// ✅ SAFE-CANCEL: Trạng thái hủy có trách nhiệm dành cho đơn đã thanh toán online
export const PAID_ORDER_SAFE_CANCEL_STATUSES = new Set([
  "CANCEL_REFUND_PENDING",
  "INCIDENT_REFUND_PROCESSING",
]);

// Guard: kiểm tra đơn có được phép hủy trực tiếp không (chưa thanh toán mới được hủy thô)
export const isPaidOrder = (order) => order?.paymentStatus === "PAID";

const STATUS_ALIASES = Object.freeze({
  NEW: "PENDING",
  PACKING: "PREPARING",
  READY_TO_SHIP: "PREPARING_SHIPMENT",
  IN_TRANSIT: "SHIPPING",
  PICKING: "PROCESSING",
  PICKUP_COMPLETED: "PREPARING_SHIPMENT",
});

const ONLINE_TRANSITIONS = Object.freeze({
  PENDING: ["CONFIRMED", "CANCELLED", "CANCEL_REFUND_PENDING"],
  PENDING_PAYMENT: ["PENDING", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_CONFIRMED: ["PENDING", "CONFIRMED", "CANCEL_REFUND_PENDING"],
  PAYMENT_VERIFIED: ["PENDING", "CONFIRMED", "CANCEL_REFUND_PENDING"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "PENDING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "CANCEL_REFUND_PENDING"],
  PROCESSING: ["PREPARING", "PREPARING_SHIPMENT", "CANCEL_REFUND_PENDING"],
  PREPARING: ["PREPARING_SHIPMENT", "CANCEL_REFUND_PENDING"],
  PREPARING_SHIPMENT: ["SHIPPING", "CANCEL_REFUND_PENDING"],
  READY_FOR_PICKUP: ["PICKED_UP", "CANCEL_REFUND_PENDING"],
  SHIPPING: ["DELIVERED", "RETURNED", "DELIVERY_FAILED", "CANCEL_REFUND_PENDING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED", "DELIVERY_FAILED", "CANCEL_REFUND_PENDING"],
  DELIVERED: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  PICKED_UP: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  RETURN_REQUESTED: ["RETURNED", "COMPLETED"],
  DELIVERY_FAILED: ["CANCELLED", "RETURNED", "SHIPPING"],
  // Safe-cancel statuses: luồng hoàn tiền
  CANCEL_REFUND_PENDING: ["INCIDENT_REFUND_PROCESSING", "RETURNED"],
  INCIDENT_REFUND_PROCESSING: ["RETURNED"],
  COMPLETED: [],
  RETURNED: [],
  CANCELLED: [],
});

const IN_STORE_TRANSITIONS = Object.freeze({
  PENDING: ["CONFIRMED", "PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "PENDING_PAYMENT", "PENDING_ORDER_MANAGEMENT", "CANCELLED"],
  PENDING_ORDER_MANAGEMENT: ["PROCESSING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  PROCESSING: ["PREPARING", "PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  PREPARING: ["PREPARING_SHIPMENT", "PENDING_PAYMENT", "CANCELLED"],
  PREPARING_SHIPMENT: ["CONFIRMED", "PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["DELIVERED", "CANCELLED"],
  SHIPPING: ["DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  PICKED_UP: ["COMPLETED", "RETURN_REQUESTED", "RETURNED"],
  RETURN_REQUESTED: ["RETURNED", "COMPLETED"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  // Safe-cancel (in-store orders paid online can also use safe-cancel)
  CANCEL_REFUND_PENDING: ["INCIDENT_REFUND_PROCESSING", "RETURNED"],
  INCIDENT_REFUND_PROCESSING: ["RETURNED"],
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
    return ["CONFIRMED", "PROCESSING", "SHIPPING", "CANCELLED", "CANCEL_REFUND_PENDING", "INCIDENT_REFUND_PROCESSING"].includes(
      targetStatus
    );
  }

  if (WAREHOUSE_ROLES.has(role)) {
    return ["PROCESSING", "PREPARING", "PREPARING_SHIPMENT", "SHIPPING", "PENDING_PAYMENT", "CANCELLED", "CANCEL_REFUND_PENDING", "INCIDENT_REFUND_PROCESSING"].includes(
      targetStatus
    );
  }

  if (SHIPPER_ROLES.has(role)) {
    return ["SHIPPING", "DELIVERED", "RETURNED"].includes(targetStatus);
  }

  if (POS_ROLES.has(role)) {
    return ["CONFIRMED", "PENDING_PAYMENT"].includes(targetStatus);
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

  // ✅ PAID-ORDER GUARD: Block direct CANCELLED for any role if order is PAID
  // Admin must use CANCEL_REFUND_PENDING instead.
  if (targetStatus === "CANCELLED" && isPaidOrder(order)) {
    return {
      allowed: false,
      code: "PAID_ORDER_CANCEL_BLOCKED",
      reason:
        "Đơn đã thanh toán không được hủy trực tiếp. Dùng trạng thái \'Hủy đơn – Cần hoàn tiền\' (CANCEL_REFUND_PENDING).",
    };
  }

  // ADMIN has broad permissions but must still pass the paid-order guard above
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
