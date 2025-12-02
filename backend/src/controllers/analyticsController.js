// ============================================
// FILE: backend/src/controllers/analyticsController.js
// UPDATED: Thêm endpoints cho employee KPI
// ============================================

import employeeAnalyticsService from "../services/employeeAnalyticsService.js";

/**
 * GET /api/analytics/employee/kpi
 * Lấy KPI tất cả nhân viên (Admin only)
 */
export const getEmployeeKPI = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [posStats, shipperStats, cashierStats, topPerformers] =
      await Promise.all([
        employeeAnalyticsService.getPOSStaffStats(startDate, endDate),
        employeeAnalyticsService.getShipperStats(startDate, endDate),
        employeeAnalyticsService.getCashierStats(startDate, endDate),
        employeeAnalyticsService.getTopPerformers(startDate, endDate),
      ]);

    res.json({
      success: true,
      data: {
        posStaffPerformance: posStats,
        shipperPerformance: shipperStats,
        cashierPerformance: cashierStats,
        topPOSStaff: topPerformers.topPOSStaff,
        topShipper: topPerformers.topShipper,
        topCashier: topPerformers.topCashier,
        // Format for charts
        posStaffRevenue: posStats.map((s) => ({
          name: s.name,
          value: s.revenue,
        })),
        shipperSuccessRate: shipperStats.map((s) => ({
          name: s.name,
          successRate: parseFloat(s.successRate),
        })),
      },
    });
  } catch (error) {
    console.error("getEmployeeKPI error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thống kê nhân viên",
    });
  }
};

/**
 * GET /api/analytics/employee/personal
 * Lấy thống kê cá nhân (POS Staff, Shipper, Cashier)
 */
export const getPersonalStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = "today" } = req.query;

    const stats = await employeeAnalyticsService.getPersonalStats(
      userId,
      period
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("getPersonalStats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thống kê cá nhân",
    });
  }
};

export default {
  getEmployeeKPI,
  getPersonalStats,
};