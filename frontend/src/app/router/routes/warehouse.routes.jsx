import React from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "@/app/layouts/dashboard/DashboardLayout";
import ProtectedRoute from "@/app/router/guards/ProtectedRoute";
import { DeviceManagementPage } from "@/features/afterSales";
import {
  WarehouseProductsPage,
  ProductDetailPage,
} from "@/features/catalog";
import {
  WarehouseConfigPage,
  WarehouseVisualizerPage,
  WarehouseStaffDashboard,
  ReceiveGoodsPage,
  PickOrdersPage,
  TransferStockPage,
} from "@/features/warehouse";

const warehouseRoutes = (
  <>
    <Route
      element={
        <ProtectedRoute allowedRoles={["ADMIN", "WAREHOUSE_MANAGER"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/admin/warehouse-config" element={<WarehouseConfigPage />} />
      <Route path="/admin/warehouse-config/:id/visual" element={<WarehouseVisualizerPage />} />
    </Route>

    <Route
      element={
        <ProtectedRoute allowedRoles={["PRODUCT_MANAGER", "ADMIN"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/warehouse/products" element={<WarehouseProductsPage />} />
      <Route path="/warehouse/products/:productSlug" element={<ProductDetailPage />} />
    </Route>

    <Route
      element={
        <ProtectedRoute allowedRoles={["WAREHOUSE_MANAGER", "ADMIN", "WAREHOUSE_STAFF"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/warehouse-staff" element={<WarehouseStaffDashboard />} />
      <Route path="/warehouse-staff/receive-goods" element={<ReceiveGoodsPage />} />
      <Route path="/warehouse-staff/pick-orders" element={<PickOrdersPage />} />
      <Route path="/warehouse-staff/transfer" element={<TransferStockPage />} />
      <Route path="/warehouse-staff/devices" element={<DeviceManagementPage />} />
    </Route>
  </>
);

export default warehouseRoutes;
