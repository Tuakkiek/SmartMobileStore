// ============================================
// FILE: backend/src/services/employeeAnalyticsService.js
// ✅ FIXED: Query bao gồm cả đơn do Order Manager chỉ định Shipper
// ============================================

import Order from "../models/Order.js";

/**
 * Lấy thống kê KPI của POS Staff (GIỮ NGUYÊN)
 */
export const getPOSStaffStats = async (startDate, endDate) => {
  const match = {
    orderSource: "IN_STORE",
    status: { $in: ["DELIVERED", "CANCELLED"] },
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
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
  ]);

  return stats.map((s) => ({
    staffId: s._id.staffId,
    name: s._id.staffName || "Unknown",
    orderCount: s.orderCount,
    revenue: s.revenue,
    cancelledCount: s.cancelledCount,
  }));
};

/**
 * ✅ FIXED: Lấy thống kê KPI của Shipper
 * Bây giờ bao gồm cả đơn do Order Manager chỉ định
 */
export const getShipperStats = async (startDate, endDate) => {
  const match = {
    "shipperInfo.shipperId": { $exists: true }, // ✅ VẪN GIỮ - Đảm bảo có Shipper
    status: { $in: ["SHIPPING", "DELIVERED", "RETURNED"] }, // ✅ THÊM SHIPPING
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          shipperId: "$shipperInfo.shipperId",
          shipperName: "$shipperInfo.shipperName",
        },
        totalOrders: { $sum: 1 },
        shipping: {
          $sum: { $cond: [{ $eq: ["$status", "SHIPPING"] }, 1, 0] }, // ✅ THÊM
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
  ]);

  return stats.map((s) => ({
    shipperId: s._id.shipperId,
    name: s._id.shipperName || "Unknown",
    totalOrders: s.totalOrders,
    shipping: s.shipping, // ✅ THÊM
    delivered: s.delivered,
    returned: s.returned,
    // ✅ Tính tỷ lệ thành công dựa trên (delivered + returned) / totalOrders
    successRate:
      s.totalOrders > 0
        ? ((s.delivered / (s.delivered + s.returned)) * 100).toFixed(2)
        : 0,
  }));
};

/**
 * Lấy thống kê KPI của Cashier (GIỮ NGUYÊN)
 */
export const getCashierStats = async (startDate, endDate) => {
  const match = {
    "posInfo.cashierId": { $exists: true },
    paymentStatus: "PAID",
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
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
  ]);

  return stats.map((s) => ({
    cashierId: s._id.cashierId,
    name: s._id.cashierName || "Unknown",
    transactionCount: s.transactionCount,
    totalAmount: s.totalAmount,
    vatInvoiceCount: s.vatInvoiceCount,
  }));
};

/**
 * Lấy top performer của từng vai trò (GIỮ NGUYÊN)
 */
export const getTopPerformers = async (startDate, endDate) => {
  const [posStats, shipperStats, cashierStats] = await Promise.all([
    getPOSStaffStats(startDate, endDate),
    getShipperStats(startDate, endDate),
    getCashierStats(startDate, endDate),
  ]);

  return {
    topPOSStaff: posStats[0] || null,
    topShipper: shipperStats[0] || null,
    topCashier: cashierStats[0] || null,
  };
};

/**
 * ✅ FIXED: Lấy thống kê cá nhân theo thời gian (today, week, month, year)
 */
export const getPersonalStats = async (userId, period = "today") => {
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

  // Thống kê POS Staff (GIỮ NGUYÊN)
  const posOrders = await Order.countDocuments({
    "posInfo.staffId": userId,
    orderSource: "IN_STORE",
    createdAt: { $gte: startDate },
  });

  const posRevenue = await Order.aggregate([
    {
      $match: {
        "posInfo.staffId": userId,
        status: "DELIVERED",
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // ✅ FIXED: Thống kê Shipper - Bao gồm cả SHIPPING
  const shipperOrders = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: { $in: ["SHIPPING", "DELIVERED", "RETURNED"] }, // ✅ THÊM SHIPPING
    createdAt: { $gte: startDate },
  });

  const shipperShipping = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: "SHIPPING", // ✅ THÊM
    createdAt: { $gte: startDate },
  });

  const shipperDelivered = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: "DELIVERED",
    createdAt: { $gte: startDate },
  });

  const shipperReturned = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: "RETURNED",
    createdAt: { $gte: startDate },
  });

  // Thống kê Cashier (GIỮ NGUYÊN)
  const cashierTransactions = await Order.countDocuments({
    "posInfo.cashierId": userId,
    paymentStatus: "PAID",
    createdAt: { $gte: startDate },
  });

  const cashierRevenue = await Order.aggregate([
    {
      $match: {
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
      shipping: shipperShipping, // ✅ THÊM
      delivered: shipperDelivered,
      returned: shipperReturned,
      // ✅ Tính tỷ lệ thành công dựa trên delivered / (delivered + returned)
      successRate:
        shipperDelivered + shipperReturned > 0
          ? (
              (shipperDelivered / (shipperDelivered + shipperReturned)) *
              100
            ).toFixed(2)
          : 0,
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
