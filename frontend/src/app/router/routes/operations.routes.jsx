import React from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "@/app/layouts/dashboard/DashboardLayout";
import ProtectedRoute from "@/app/router/guards/ProtectedRoute";
import { OrderManagementPage } from "@/features/orders";
import { POSDashboard, POSOrderHistory, POSOrderHandover } from "@/features/pos";
import { CashierDashboard, VATInvoicesPage } from "@/features/cashier";
import { ShipperDashboard } from "@/features/shipping";

const operationsRoutes = (
  <>
    <Route
      element={
        <ProtectedRoute allowedRoles={["ORDER_MANAGER", "ADMIN"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/order-manager/orders" element={<OrderManagementPage />} />
    </Route>

    <Route
      element={
        <ProtectedRoute allowedRoles={["POS_STAFF", "ADMIN"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/pos/dashboard" element={<POSDashboard />} />
      <Route path="/pos/orders" element={<POSOrderHistory />} />
      <Route path="/pos-staff/handover/:orderId" element={<POSOrderHandover />} />
    </Route>

    <Route
      element={
        <ProtectedRoute allowedRoles={["CASHIER", "ADMIN"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/cashier/dashboard" element={<CashierDashboard />} />
      <Route path="/CASHIER/dashboard" element={<CashierDashboard />} />
      <Route path="/cashier/vat-invoices" element={<VATInvoicesPage />} />
      <Route path="/CASHIER/vat-invoices" element={<VATInvoicesPage />} />
    </Route>

    <Route
      element={
        <ProtectedRoute allowedRoles={["SHIPPER", "ADMIN"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/shipper/dashboard" element={<ShipperDashboard />} />
    </Route>
  </>
);

export default operationsRoutes;
