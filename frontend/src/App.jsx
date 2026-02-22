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
import OrderDetailPage from "@/pages/customer/OrderDetailPage";
import ProfilePage from "@/pages/customer/ProfilePage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import EmployeesPage from "@/pages/admin/EmployeesPage";
import PromotionsPage from "@/pages/admin/PromotionsPage";
import HomePageEditor from "@/pages/admin/HomePageEditor";
import ShortVideoAdminPage from "@/pages/admin/ShortVideoAdminPage";
import BrandManagementPage from "@/pages/admin/BrandManagementPage";
import ProductTypeManagementPage from "@/pages/admin/ProductTypeManagementPage";
import WarehouseConfigPage from "@/pages/admin/WarehouseConfigPage";
import InventoryDashboard from "@/pages/admin/InventoryDashboard";
import StoreManagementPage from "@/pages/admin/StoreManagementPage";
import WarehouseVisualizerPage from "@/pages/admin/WarehouseVisualizerPage";

import WarehouseProductsPage from "@/pages/warehouse/ProductsPage";
import WarehouseStaffDashboard from "@/pages/warehouse-staff/WarehouseStaffDashboard";
import ReceiveGoodsPage from "@/pages/warehouse-staff/ReceiveGoodsPage";
import PickOrdersPage from "@/pages/warehouse-staff/PickOrdersPage";
import TransferStockPage from "@/pages/warehouse-staff/TransferStockPage";
import OrderManagementPage from "@/pages/order-manager/OrderManagementPage";

import ShipperDashboard from "@/pages/shipper/ShipperDashboard";

import POSDashboard from "@/pages/pos-staff/POSDashboard";
import POSOrderHistory from "@/pages/pos-staff/POSOrderHistory";
import POSOrderHandover from "@/pages/pos-staff/POSOrderHandover";

import CASHIERDashboard from "@/pages/cashier/CASHIERDashboard";
import VATInvoicesPage from "@/pages/cashier/VATInvoicesPage";

import Page404 from "@/pages/page404";
import SearchResultsPage from "@/pages/SearchResultsPage";
import VideosPage from "@/pages/VideosPage"; // ï¿½o. NEW

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

  // ✅ GLOBAL_ADMIN bypass
  if (user?.role === "GLOBAL_ADMIN") {
    return children;
  }

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

          {/* ï¿½o. NEW: Videos Page */}
          <Route path="/videos" element={<VideosPage />} />

          {/* Products */}
          <Route path="/products" element={<ProductsPage />} />

          {/* Legacy category routes */}
          <Route
            path="/dien-thoai"
            element={<ProductsPage category="iPhone" />}
          />
          <Route
            path="/may-tinh-bang"
            element={<ProductsPage category="iPad" />}
          />
          <Route path="/macbook" element={<ProductsPage category="Mac" />} />
          <Route
            path="/tai-nghe"
            element={<ProductsPage category="AirPods" />}
          />
          <Route
            path="/apple-watch"
            element={<ProductsPage category="AppleWatch" />}
          />
          <Route
            path="/phu-kien"
            element={<ProductsPage category="Accessories" />}
          />

          {/* Search */}
          <Route path="/tim-kiem" element={<SearchResultsPage />} />

          {/* ï¿½o. NEW: Universal Product Detail (must come before legacy routes) */}
          <Route
            path="/products/:productSlug"
            element={<ProductDetailPage />}
          />

          {/* Product Detail (Legacy category-based) */}
          <Route
            path="/:categorySlug/:productSlug"
            element={<ProductDetailPage />}
          />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ========================================
            CUSTOMER ROUTES - NESTED STRUCTURE
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
            path="/cart/checkout"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <CheckoutPage />
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
          <Route path="/admin/homepage-editor" element={<HomePageEditor />} />
          <Route path="/admin/short-videos" element={<ShortVideoAdminPage />} />
          <Route path="/admin/brands" element={<BrandManagementPage />} />
          <Route path="/admin/product-types" element={<ProductTypeManagementPage />} />
          <Route path="/admin/stores" element={<StoreManagementPage />} />
          <Route path="/admin/inventory-dashboard" element={<InventoryDashboard />} />
        </Route>

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

        {/* ========================================
            PRODUCT MANAGER
        ======================================== */}
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

        {/* ========================================
            WAREHOUSE STAFF
        ======================================== */}
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
          <Route path="/pos-staff/handover/:orderId" element={<POSOrderHandover />} />
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
          <Route path="/CASHIER/dashboard" element={<CASHIERDashboard />} />
          <Route path="/cashier/vat-invoices" element={<VATInvoicesPage />} />
          <Route path="/CASHIER/vat-invoices" element={<VATInvoicesPage />} />
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

        {/* VNPay Return */}
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

