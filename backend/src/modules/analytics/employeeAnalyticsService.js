import mongoose from "mongoose";
import Order from "../order/Order.js";

const toObjectIdIfValid = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const asString = String(value).trim();
  if (!asString) return null;
  return mongoose.Types.ObjectId.isValid(asString)
    ? new mongoose.Types.ObjectId(asString)
    : null;
};

const buildDateMatch = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return {};
  }

  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) createdAt.$lte = new Date(endDate);
  return { createdAt };
};

const normalizeEmployeeStatsOptions = (startDateOrOptions, endDate, legacyBranchId) => {
  if (startDateOrOptions && typeof startDateOrOptions === "object") {
    const branchId = startDateOrOptions.branchId || startDateOrOptions.storeId || "";
    return {
      startDate: startDateOrOptions.startDate || null,
      endDate: startDateOrOptions.endDate || null,
      branchId: branchId ? String(branchId) : "",
      orderRepo: startDateOrOptions.orderRepo || null,
      scopeMode: startDateOrOptions.scopeMode || "branch",
    };
  }

  return {
    startDate: startDateOrOptions || null,
    endDate: endDate || null,
    branchId: legacyBranchId ? String(legacyBranchId) : "",
    orderRepo: null,
    scopeMode: "branch",
  };
};

const aggregateOrders = async ({ orderRepo, pipeline, scopeMode }) => {
  if (orderRepo?.aggregate) {
    return orderRepo.aggregate(pipeline, { mode: scopeMode });
  }
  return Order.aggregate(pipeline);
};

const applyLegacyBranchMatch = (match, branchId) => {
  if (!branchId) return;
  const asObjectId = toObjectIdIfValid(branchId);
  match["assignedStore.storeId"] = asObjectId || branchId;
};

export const getPOSStaffStats = async (startDateOrOptions, endDate, legacyBranchId) => {
  const options = normalizeEmployeeStatsOptions(
    startDateOrOptions,
    endDate,
    legacyBranchId
  );

  const match = {
    orderSource: "IN_STORE",
    status: { $in: ["DELIVERED", "CANCELLED"] },
    ...buildDateMatch(options.startDate, options.endDate),
  };

  if (options.branchId && !options.orderRepo) {
    applyLegacyBranchMatch(match, options.branchId);
  }

  const stats = await aggregateOrders({
    orderRepo: options.orderRepo,
    scopeMode: options.scopeMode,
    pipeline: [
      { $match: match },
      {
        $group: {
          _id: {
            staffId: "$posInfo.staffId",
            staffName: "$posInfo.staffName",
          },
          orderCount: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "DELIVERED"] }, "$totalAmount", 0],
            },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
          },
        },
      },
      { $sort: { revenue: -1 } },
    ],
  });

  return stats.map((entry) => ({
    staffId: entry._id.staffId,
    name: entry._id.staffName || "Unknown",
    orderCount: entry.orderCount,
    revenue: entry.revenue,
    cancelledCount: entry.cancelledCount,
  }));
};

export const getShipperStats = async (startDateOrOptions, endDate, legacyBranchId) => {
  const options = normalizeEmployeeStatsOptions(
    startDateOrOptions,
    endDate,
    legacyBranchId
  );

  const match = {
    "shipperInfo.shipperId": { $exists: true },
    status: { $in: ["SHIPPING", "DELIVERED", "RETURNED"] },
    ...buildDateMatch(options.startDate, options.endDate),
  };

  if (options.branchId && !options.orderRepo) {
    applyLegacyBranchMatch(match, options.branchId);
  }

  const stats = await aggregateOrders({
    orderRepo: options.orderRepo,
    scopeMode: options.scopeMode,
    pipeline: [
      { $match: match },
      {
        $group: {
          _id: {
            shipperId: "$shipperInfo.shipperId",
            shipperName: "$shipperInfo.shipperName",
          },
          totalOrders: { $sum: 1 },
          shipping: {
            $sum: { $cond: [{ $eq: ["$status", "SHIPPING"] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
          },
          returned: {
            $sum: { $cond: [{ $eq: ["$status", "RETURNED"] }, 1, 0] },
          },
        },
      },
      { $sort: { delivered: -1 } },
    ],
  });

  return stats.map((entry) => {
    const completed = entry.delivered + entry.returned;
    const successRate =
      completed > 0
        ? parseFloat(((entry.delivered / completed) * 100).toFixed(2))
        : 0;

    return {
      shipperId: entry._id.shipperId,
      name: entry._id.shipperName || "Unknown",
      totalOrders: entry.totalOrders,
      shipping: entry.shipping,
      delivered: entry.delivered,
      returned: entry.returned,
      successRate,
    };
  });
};

export const getCashierStats = async (startDateOrOptions, endDate, legacyBranchId) => {
  const options = normalizeEmployeeStatsOptions(
    startDateOrOptions,
    endDate,
    legacyBranchId
  );

  const match = {
    "posInfo.cashierId": { $exists: true },
    paymentStatus: "PAID",
    ...buildDateMatch(options.startDate, options.endDate),
  };

  if (options.branchId && !options.orderRepo) {
    applyLegacyBranchMatch(match, options.branchId);
  }

  const stats = await aggregateOrders({
    orderRepo: options.orderRepo,
    scopeMode: options.scopeMode,
    pipeline: [
      { $match: match },
      {
        $group: {
          _id: {
            cashierId: "$posInfo.cashierId",
            cashierName: "$posInfo.cashierName",
          },
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          vatInvoiceCount: {
            $sum: { $cond: [{ $ne: ["$vatInvoice", null] }, 1, 0] },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    ],
  });

  return stats.map((entry) => ({
    cashierId: entry._id.cashierId,
    name: entry._id.cashierName || "Unknown",
    transactionCount: entry.transactionCount,
    totalAmount: entry.totalAmount,
    vatInvoiceCount: entry.vatInvoiceCount,
  }));
};

export const getTopPerformers = async (startDateOrOptions, endDate, legacyBranchId) => {
  const options = normalizeEmployeeStatsOptions(
    startDateOrOptions,
    endDate,
    legacyBranchId
  );

  const [posStats, shipperStats, cashierStats] = await Promise.all([
    getPOSStaffStats(options),
    getShipperStats(options),
    getCashierStats(options),
  ]);

  return {
    topPOSStaff: posStats[0] || null,
    topShipper: shipperStats[0] || null,
    topCashier: cashierStats[0] || null,
  };
};

export const getPersonalStats = async (userId, period = "today", options = {}) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
  }

  const baseScope = {};
  if (options?.branchId) {
    const scopedBranchId = toObjectIdIfValid(options.branchId);
    if (scopedBranchId) {
      baseScope["assignedStore.storeId"] = scopedBranchId;
    }
  }

  const posOrders = await Order.countDocuments({
    ...baseScope,
    "posInfo.staffId": userId,
    orderSource: "IN_STORE",
    createdAt: { $gte: startDate },
  });

  const posRevenue = await Order.aggregate([
    {
      $match: {
        ...baseScope,
        "posInfo.staffId": userId,
        status: "DELIVERED",
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  const shipperOrders = await Order.countDocuments({
    ...baseScope,
    "shipperInfo.shipperId": userId,
    status: { $in: ["SHIPPING", "DELIVERED", "RETURNED"] },
    createdAt: { $gte: startDate },
  });

  const shipperShipping = await Order.countDocuments({
    ...baseScope,
    "shipperInfo.shipperId": userId,
    status: "SHIPPING",
    createdAt: { $gte: startDate },
  });

  const shipperDelivered = await Order.countDocuments({
    ...baseScope,
    "shipperInfo.shipperId": userId,
    status: "DELIVERED",
    createdAt: { $gte: startDate },
  });

  const shipperReturned = await Order.countDocuments({
    ...baseScope,
    "shipperInfo.shipperId": userId,
    status: "RETURNED",
    createdAt: { $gte: startDate },
  });

  const completed = shipperDelivered + shipperReturned;
  const successRate =
    completed > 0
      ? parseFloat(((shipperDelivered / completed) * 100).toFixed(2))
      : 0;

  const cashierTransactions = await Order.countDocuments({
    ...baseScope,
    "posInfo.cashierId": userId,
    paymentStatus: "PAID",
    createdAt: { $gte: startDate },
  });

  const cashierRevenue = await Order.aggregate([
    {
      $match: {
        ...baseScope,
        "posInfo.cashierId": userId,
        paymentStatus: "PAID",
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  return {
    period,
    startDate,
    pos: {
      orders: posOrders,
      revenue: posRevenue[0]?.total || 0,
    },
    shipper: {
      total: shipperOrders,
      shipping: shipperShipping,
      delivered: shipperDelivered,
      returned: shipperReturned,
      successRate,
    },
    cashier: {
      transactions: cashierTransactions,
      revenue: cashierRevenue[0]?.total || 0,
    },
  };
};

export default {
  getPOSStaffStats,
  getShipperStats,
  getCashierStats,
  getTopPerformers,
  getPersonalStats,
};
