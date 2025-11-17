// ============================================
// FILE: frontend/src/App.jsx
// ✅ HOÀN CHỈNH: Tất cả routes cho 6 vai trò
// ============================================

import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Loading } from "@/components/shared/Loading";
import { Toaster } from "sonner";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

// Pages
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CartPage from "@/pages/customer/CartPage";
import CheckoutPage from "@/pages/customer/CheckoutPage";
import OrdersPage from "@/pages/customer/OrdersPage";
import OrderDetailPage from "@/pages/customer/OrderDetailPage";
import ProfilePage from "@/pages/customer/ProfilePage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import EmployeesPage from "@/pages/admin/EmployeesPage";
import PromotionsPage from "@/pages/admin/PromotionsPage";
import WarehouseProductsPage from "@/pages/warehouse/ProductsPage";
import OrderManagementPage from "@/pages/order-manager/OrderManagementPage";
import ShipperDashboard from "@/pages/shipper/ShipperDashboard";
import POSDashboard from "@/pages/pos-staff/POSDashboard";
import POSOrderHistory from "@/pages/pos-staff/POSOrderHistory"; // ✅ THÊM
import CASHIERDashboard from "@/pages/CASHIER/CASHIERDashboard";
import VATInvoicesPage from "@/pages/CASHIER/VATInvoicesPage";

// ============================================
// SCROLL TO TOP COMPONENT
// ============================================
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// ============================================
// PROTECTED ROUTE
// ============================================
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, rehydrating } = useAuthStore();
  if (rehydrating) return <Loading />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/" replace />;
  return children;
};

// ============================================
// MAIN APP
// ============================================
function App() {
  const { getCurrentUser } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) getCurrentUser();
  }, [getCurrentUser]);

  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        {/* ========================================
            PUBLIC ROUTES
        ======================================== */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/dien-thoai/*" element={<ProductDetailPage />} />
          <Route path="/may-tinh-bang/*" element={<ProductDetailPage />} />
          <Route path="/macbook/*" element={<ProductDetailPage />} />
          <Route path="/tai-nghe/*" element={<ProductDetailPage />} />
          <Route path="/apple-watch/*" element={<ProductDetailPage />} />
          <Route path="/phu-kien/*" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ========================================
            CUSTOMER ROUTES
        ======================================== */}
        <Route element={<MainLayout />}>
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ========================================
            ADMIN ROUTES
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<EmployeesPage />} />
          <Route path="/admin/promotions" element={<PromotionsPage />} />
          <Route path="/admin/shipping" element={<ShipperDashboard />} />
        </Route>

        {/* ========================================
            WAREHOUSE STAFF ROUTES
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE_STAFF", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/warehouse/products"
            element={<WarehouseProductsPage />}
          />
        </Route>

        {/* ========================================
            ORDER MANAGER ROUTES
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["ORDER_MANAGER", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/order-manager/orders"
            element={<OrderManagementPage />}
          />
        </Route>

        {/* ========================================
            POS STAFF ROUTES
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["POS_STAFF", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/pos/dashboard" element={<POSDashboard />} />
          <Route path="/pos/orders" element={<POSOrderHistory />} />{" "}
          {/* ✅ THÊM */}
        </Route>

        {/* ========================================
            CASHIER ROUTES
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["CASHIER", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/CASHIER/dashboard" element={<CASHIERDashboard />} />
          <Route path="/CASHIER/vat-invoices" element={<VATInvoicesPage />} />
        </Route>

        {/* ========================================
            SHIPPER ROUTES
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["SHIPPER", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/shipper/dashboard" element={<ShipperDashboard />} />
        </Route>

        {/* ========================================
            404 - NOT FOUND
        ======================================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
}

export default App;
