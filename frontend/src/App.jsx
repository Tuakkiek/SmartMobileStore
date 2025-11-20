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
import ProductsPage from "@/pages/ProductsPage"; // Dùng chung cho tất cả danh mục
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
import POSOrderHistory from "@/pages/pos-staff/POSOrderHistory";

import CASHIERDashboard from "@/pages/cashier/CASHIERDashboard";
import VATInvoicesPage from "@/pages/cashier/VATInvoicesPage";

import Page404 from "@/pages/page404";
import SearchResultsPage from "@/pages/SearchResultsPage";

import VNPayReturnPage from "@/pages/customer/VNPayReturnPage";

// ============================================
// SCROLL TO TOP
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

  if (!isAuthenticated || !user) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

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
      <Toaster position="bottom-right" richColors />

      <Routes>
        {/* ========================================
            PUBLIC ROUTES - MainLayout
======================================== */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />

          {/* Danh mục sản phẩm - URL đẹp + dùng chung ProductsPage */}
          <Route path="/dien-thoai" element={<ProductsPage />} />
          <Route path="/may-tinh-bang" element={<ProductsPage />} />
          <Route path="/macbook" element={<ProductsPage />} />
          <Route path="/tai-nghe" element={<ProductsPage />} />
          <Route path="/apple-watch" element={<ProductsPage />} />
          <Route path="/phu-kien" element={<ProductsPage />} />

          {/* Route cũ vẫn giữ để tương thích (nếu cần) */}
          <Route path="/products" element={<ProductsPage />} />

          {/* Tìm kiếm */}
          <Route path="/tim-kiem" element={<SearchResultsPage />} />

          {/* Chi tiết sản phẩm - dùng slug đẹp */}
          <Route
            path="/:categorySlug/:productSlug"
            element={<ProductDetailPage />}
          />

          {/* Đăng nhập / Đăng ký */}
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
        </Route>
        {/* ========================================
            WAREHOUSE STAFF
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
            ORDER MANAGER
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
            POS STAFF
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["POS_STAFF", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/pos/dashboard" element={<POSDashboard />} />
          <Route path="/pos/orders" element={<POSOrderHistory />} />
        </Route>

        {/* ========================================
            CASHIER
        ======================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["CASHIER", "ADMIN"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/cashier/dashboard" element={<CASHIERDashboard />} />
          <Route path="/cashier/vat-invoices" element={<VATInvoicesPage />} />
        </Route>

        {/* ========================================
            SHIPPER
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

        <Route path="/payment/vnpay/return" element={<VNPayReturnPage />} />

        {/* ========================================
            404 - NOT FOUND
        ======================================== */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
