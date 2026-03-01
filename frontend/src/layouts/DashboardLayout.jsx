// ============================================
// FILE: src/layouts/DashboardLayout.jsx
// UPDATED: Thêm menu cho POS_STAFF và CASHIER
// FIXED: Responsive user info – tên dài không bị cắt
// FIXED: Lỗi hiển thị tiếng Việt (UTF-8)
// ============================================

import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Truck,
  LogOut,
  Menu,
  X,
  Receipt,
  FileText,
  TrendingUp,
  History,
  Video,
  Tags,
  Layers,
  ClipboardList,
  RefreshCw,
  Warehouse,
  Boxes,
  Store,
  Percent,
  Smartphone,
  PackageCheck,
  PackagePlus,
  ShieldCheck,
} from "lucide-react";

import { Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authz, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isGlobalAdmin = Boolean(
    authz?.isGlobalAdmin ||
      String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN"
  );

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // ============================================
  // MENU ITEMS THEO ROLE
  // ============================================
  const getNavigationItems = () => {
    const items = [];

    if (user?.role === "ADMIN" || user?.role === "GLOBAL_ADMIN") {
      items.push(
        { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/admin/stores", icon: Store, label: "Quản lý cửa hàng" },
        {
          path: "/admin/inventory-dashboard",
          icon: Boxes,
          label: "Tổng quan kho",
        },
        { path: "/admin/stock-in", icon: PackagePlus, label: "Nhập kho" },
        { path: "/admin/employees", icon: Users, label: "Quản lý nhân viên" },
        { path: "/admin/brands", icon: Tags, label: "Quản lý hãng" },
        { path: "/admin/product-types", icon: Layers, label: "Loại sản phẩm" },
        { path: "/admin/promotions", icon: Percent, label: "Khuyến mãi" },
        {
          path: "/admin/homepage-editor",
          icon: Layout,
          label: "Giao diện trang chủ",
        },
        { path: "/admin/short-videos", icon: Video, label: "Video ngắn" },
        {
          path: "/admin/warehouse-config",
          icon: Warehouse,
          label: "Cấu hình kho",
        },
        { path: "/warehouse/products", icon: Smartphone, label: "Sản phẩm" },
        { path: "/warehouse-staff", icon: Package, label: "Dashboard kho" },
        {
          path: "/warehouse-staff/receive-goods",
          icon: PackageCheck,
          label: "Nhận hàng",
        },
        {
          path: "/warehouse-staff/pick-orders",
          icon: ClipboardList,
          label: "Xuất kho",
        },
        {
          path: "/warehouse-staff/transfer",
          icon: RefreshCw,
          label: "Chuyển kho",
        },
        {
          path: "/order-manager/orders",
          icon: ShoppingBag,
          label: "Đơn hàng",
        },
        { path: "/shipper/dashboard", icon: Truck, label: "Giao hàng" },
        { path: "/pos/dashboard", icon: Receipt, label: "POS - Bán hàng" },
        { path: "/pos/orders", icon: History, label: "Lịch sử POS" },
        {
          path: "/CASHIER/dashboard",
          icon: TrendingUp,
          label: "Thu ngân",
        },
        {
          path: "/CASHIER/vat-invoices",
          icon: FileText,
          label: "Hóa đơn",
        }
      );

      if (isGlobalAdmin) {
        items.push({
          path: "/admin/audit-logs",
          icon: ShieldCheck,
          label: "Audit Logs",
        });
      }
    } else if (user?.role === "WAREHOUSE_MANAGER") {
      items.push(
        { path: "/warehouse-staff", icon: Package, label: "Dashboard kho" },
        {
          path: "/warehouse-staff/receive-goods",
          icon: PackageCheck,
          label: "Nhận hàng",
        },
        {
          path: "/warehouse-staff/pick-orders",
          icon: ClipboardList,
          label: "Xuất kho",
        },
        {
          path: "/warehouse-staff/transfer",
          icon: RefreshCw,
          label: "Chuyển kho",
        },
        {
          path: "/admin/warehouse-config",
          icon: Warehouse,
          label: "Cấu hình kho",
        }
      );
    } else if (user?.role === "WAREHOUSE_STAFF") {
      items.push(
        { path: "/warehouse-staff", icon: Package, label: "Dashboard kho" },
        {
          path: "/warehouse-staff/receive-goods",
          icon: PackageCheck,
          label: "Nhận hàng",
        },
        {
          path: "/warehouse-staff/pick-orders",
          icon: ClipboardList,
          label: "Xuất kho",
        },
        {
          path: "/warehouse-staff/transfer",
          icon: RefreshCw,
          label: "Chuyển kho",
        }
      );
    } else if (user?.role === "PRODUCT_MANAGER") {
      items.push({
        path: "/warehouse/products",
        icon: ShoppingBag,
        label: "Quản lý sản phẩm",
      });
    } else if (user?.role === "ORDER_MANAGER") {
      items.push({
        path: "/order-manager/orders",
        icon: ShoppingBag,
        label: "Quản lý đơn hàng",
      });
    } else if (user?.role === "SHIPPER") {
      items.push({
        path: "/shipper/dashboard",
        icon: Truck,
        label: "Giao hàng",
      });
    } else if (user?.role === "POS_STAFF") {
      items.push(
        { path: "/pos/dashboard", icon: Receipt, label: "Bán hàng" },
        { path: "/pos/orders", icon: History, label: "Lịch sử đơn hàng" }
      );
    } else if (user?.role === "CASHIER") {
      items.push(
        {
          path: "/CASHIER/dashboard",
          icon: TrendingUp,
          label: "Doanh thu",
        },
        {
          path: "/CASHIER/vat-invoices",
          icon: FileText,
          label: "Hóa đơn",
        }
      );
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  // ============================================
  // HIỂN THỊ TÊN VAI TRÒ TIẾNG VIỆT
  // ============================================
  const getRoleLabel = (role) => {
    const roleMap = {
      GLOBAL_ADMIN: "Quản trị viên toàn hệ thống",
      ADMIN: "Quản trị viên",
      WAREHOUSE_MANAGER: "Quản lý kho",
      WAREHOUSE_STAFF: "Nhân viên kho",
      PRODUCT_MANAGER: "Quản lý sản phẩm",
      ORDER_MANAGER: "Quản lý đơn hàng",
      SHIPPER: "Nhân viên giao hàng",
      POS_STAFF: "Nhân viên bán hàng",
      CASHIER: "Thu ngân",
    };
    return roleMap[role] || role;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 lg:static flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/" className="font-bold text-xl">
            Trang chủ
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
              {getInitials(user?.fullName)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold line-clamp-2">
                {user?.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(user?.role)}
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Bạn có chắc chắn muốn đăng xuất?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Đăng xuất
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-16 border-b flex items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">Dashboard</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;