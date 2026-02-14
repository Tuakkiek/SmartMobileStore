import Order from "../order/Order.js";
import StoreInventory from "../inventory/StoreInventory.js";
import OmnichannelEvent from "./OmnichannelEvent.js";
import { omniLog } from "../../utils/logger.js";

const OMNICHANNEL_TYPES = ["HOME_DELIVERY", "CLICK_AND_COLLECT"];

const isMonitoringEnabled = () =>
  String(process.env.OMNICHANNEL_MONITORING_ENABLED ?? "true").toLowerCase() !==
  "false";

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const toRatio = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return Number(numerator) / Number(denominator);
};

const toPercentage = (ratio) => Number((ratio * 100).toFixed(2));

const toCountMap = (rows = [], keys = []) => {
  const map = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const row of rows) {
    if (row?._id === undefined || row?._id === null) continue;
    map[row._id] = Number(row.count) || 0;
  }
  return map;
};

const buildMissingAssignedFilter = (startDate) => ({
  createdAt: { $gte: startDate },
  fulfillmentType: { $in: OMNICHANNEL_TYPES },
  $or: [
    { "assignedStore.storeId": { $exists: false } },
    { "assignedStore.storeId": null },
  ],
});

export const trackOmnichannelEvent = async (event = {}) => {
  if (!isMonitoringEnabled()) return null;

  const payload = Object.fromEntries(
    Object.entries({
      eventType: event.eventType,
      operation: event.operation,
      level: event.level || (event.success === false ? "ERROR" : "INFO"),
      success: Boolean(event.success),
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      fulfillmentType: event.fulfillmentType,
      storeId: event.storeId,
      variantSku: event.variantSku,
      itemCount: event.itemCount,
      userId: event.userId,
      httpStatus: event.httpStatus,
      errorMessage: event.errorMessage,
      metadata: event.metadata,
    }).filter(([, value]) => value !== undefined)
  );

  if (!payload.eventType || !payload.operation) {
    return null;
  }

  try {
    return await OmnichannelEvent.create(payload);
  } catch (error) {
    omniLog.warn("trackOmnichannelEvent failed", {
      eventType: payload.eventType,
      operation: payload.operation,
      error: error.message,
    });
    return null;
  }
};

export const getOmnichannelMonitoringSummary = async ({ windowMinutes = 15 } = {}) => {
  const normalizedWindowMinutes = Math.min(toPositiveInt(windowMinutes, 15), 24 * 60);
  const now = new Date();
  const windowStart = new Date(now.getTime() - normalizedWindowMinutes * 60 * 1000);
  const fiveMinuteStart = new Date(now.getTime() - 5 * 60 * 1000);
  const fifteenMinuteStart = new Date(now.getTime() - 15 * 60 * 1000);

  const [
    ordersByFulfillmentRows,
    totalOmnichannelOrdersInWindow,
    missingAssignedStoreInWindow,
    inventoryErrorRows,
    createOrderRowsInWindow,
    omnichannel5xxCount,
    negativeInventoryCount,
    reserveReleaseErrorsIn5m,
    totalOmnichannelOrdersIn15m,
    missingAssignedStoreIn15m,
    createOrderRowsIn15m,
  ] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: windowStart },
          fulfillmentType: { $in: OMNICHANNEL_TYPES },
        },
      },
      { $group: { _id: "$fulfillmentType", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({
      createdAt: { $gte: windowStart },
      fulfillmentType: { $in: OMNICHANNEL_TYPES },
    }),
    Order.countDocuments(buildMissingAssignedFilter(windowStart)),
    OmnichannelEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: windowStart },
          success: false,
          operation: { $in: ["reserve_inventory", "release_inventory", "deduct_inventory"] },
        },
      },
      { $group: { _id: "$operation", count: { $sum: 1 } } },
    ]),
    OmnichannelEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: windowStart },
          operation: "create_order",
        },
      },
      { $group: { _id: "$success", count: { $sum: 1 } } },
    ]),
    OmnichannelEvent.countDocuments({
      createdAt: { $gte: windowStart },
      operation: "create_order",
      success: false,
      httpStatus: { $gte: 500 },
    }),
    StoreInventory.countDocuments({
      $or: [{ quantity: { $lt: 0 } }, { reserved: { $lt: 0 } }, { available: { $lt: 0 } }],
    }),
    OmnichannelEvent.countDocuments({
      createdAt: { $gte: fiveMinuteStart },
      success: false,
      operation: { $in: ["reserve_inventory", "release_inventory"] },
    }),
    Order.countDocuments({
      createdAt: { $gte: fifteenMinuteStart },
      fulfillmentType: { $in: OMNICHANNEL_TYPES },
    }),
    Order.countDocuments(buildMissingAssignedFilter(fifteenMinuteStart)),
    OmnichannelEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: fifteenMinuteStart },
          operation: "create_order",
        },
      },
      { $group: { _id: "$success", count: { $sum: 1 } } },
    ]),
  ]);

  const ordersByFulfillment = toCountMap(ordersByFulfillmentRows, OMNICHANNEL_TYPES);
  const inventoryErrorsByOp = toCountMap(inventoryErrorRows, [
    "reserve_inventory",
    "release_inventory",
    "deduct_inventory",
  ]);
  const createOrderCountsInWindow = toCountMap(createOrderRowsInWindow, [true, false]);
  const createOrderCountsIn15m = toCountMap(createOrderRowsIn15m, [true, false]);

  const createOrderTotalInWindow =
    (createOrderCountsInWindow[true] || 0) + (createOrderCountsInWindow[false] || 0);
  const createOrderFailureRateInWindow = toRatio(
    createOrderCountsInWindow[false] || 0,
    createOrderTotalInWindow
  );

  const missingAssignedStoreRateInWindow = toRatio(
    missingAssignedStoreInWindow,
    totalOmnichannelOrdersInWindow
  );

  const createOrderTotalIn15m =
    (createOrderCountsIn15m[true] || 0) + (createOrderCountsIn15m[false] || 0);
  const createOrderFailureRateIn15m = toRatio(
    createOrderCountsIn15m[false] || 0,
    createOrderTotalIn15m
  );
  const missingAssignedStoreRateIn15m = toRatio(
    missingAssignedStoreIn15m,
    totalOmnichannelOrdersIn15m
  );

  const alerts = [
    {
      id: "critical_negative_inventory",
      severity: "critical",
      triggered: negativeInventoryCount > 0,
      threshold: "any negative inventory value",
      observed: negativeInventoryCount,
      action: "Immediate incident. Freeze rollout.",
    },
    {
      id: "high_reserve_release_errors",
      severity: "high",
      triggered: reserveReleaseErrorsIn5m >= 3,
      threshold: ">= 3 errors in 5 minutes",
      observed: reserveReleaseErrorsIn5m,
      action: "Consider rollback.",
    },
    {
      id: "high_missing_assigned_store",
      severity: "high",
      triggered: missingAssignedStoreRateIn15m >= 0.02,
      threshold: ">= 2% in 15 minutes",
      observed: toPercentage(missingAssignedStoreRateIn15m),
      action: "Investigate routing and pause rollout expansion.",
    },
    {
      id: "medium_create_order_failure_rate",
      severity: "medium",
      triggered: createOrderFailureRateIn15m >= 0.01,
      threshold: ">= 1% in 15 minutes",
      observed: toPercentage(createOrderFailureRateIn15m),
      action: "Hold at current rollout percentage.",
    },
  ];

  return {
    generatedAt: now.toISOString(),
    windows: {
      dashboardMinutes: normalizedWindowMinutes,
      alerts: {
        reserveReleaseErrorsMinutes: 5,
        missingAssignedStoreMinutes: 15,
        createOrderFailureRateMinutes: 15,
      },
    },
    kpis: {
      ordersByFulfillmentType: {
        HOME_DELIVERY: ordersByFulfillment.HOME_DELIVERY || 0,
        CLICK_AND_COLLECT: ordersByFulfillment.CLICK_AND_COLLECT || 0,
      },
      inventoryErrors: {
        reserveFailures: inventoryErrorsByOp.reserve_inventory || 0,
        releaseFailures: inventoryErrorsByOp.release_inventory || 0,
        deductFailures: inventoryErrorsByOp.deduct_inventory || 0,
      },
      dataQuality: {
        totalOmnichannelOrders: totalOmnichannelOrdersInWindow,
        missingAssignedStore: missingAssignedStoreInWindow,
        missingAssignedStoreRate: toPercentage(missingAssignedStoreRateInWindow),
      },
      reliability: {
        omnichannel5xxCount: omnichannel5xxCount || 0,
        createOrderSuccessCount: createOrderCountsInWindow[true] || 0,
        createOrderFailureCount: createOrderCountsInWindow[false] || 0,
        createOrderFailureRate: toPercentage(createOrderFailureRateInWindow),
      },
      inventoryConsistency: {
        negativeInventoryCount,
      },
    },
    alerts,
  };
};

export const getOmnichannelEvents = async ({
  limit = 100,
  minutes = 60,
  operation,
  level,
  success,
} = {}) => {
  const safeLimit = Math.min(toPositiveInt(limit, 100), 500);
  const safeMinutes = Math.min(toPositiveInt(minutes, 60), 24 * 60);
  const startDate = new Date(Date.now() - safeMinutes * 60 * 1000);

  const filter = {
    createdAt: { $gte: startDate },
  };

  if (operation) filter.operation = operation;
  if (level) filter.level = String(level).toUpperCase();
  if (success === true || success === false) filter.success = success;

  return OmnichannelEvent.find(filter).sort({ createdAt: -1 }).limit(safeLimit).lean();
};

export default {
  trackOmnichannelEvent,
  getOmnichannelMonitoringSummary,
  getOmnichannelEvents,
};
