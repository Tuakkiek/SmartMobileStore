// FILE: src/layouts/DashboardLayout.jsx
// ============================================
import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Tag,
  LogOut,
  Menu,
  X,
} from "lucide-react";
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
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Navigation items based on role
  const getNavigationItems = () => {
    const items = [];

    if (user?.role === "ADMIN") {
      items.push(
        { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/admin/employees", icon: Users, label: "Quản lý nhân viên" },
        { path: "/admin/promotions", icon: Tag, label: "Khuyến mãi" },
        { path: "/warehouse/products", icon: Package, label: "Sản phẩm" },
        { path: "/order-manager/orders", icon: ShoppingBag, label: "Đơn hàng" }
      );
    } else if (user?.role === "WAREHOUSE_STAFF") {
      items.push({
        path: "/warehouse/products",
        icon: Package,
        label: "Quản lý sản phẩm",
      });
    } else if (user?.role === "ORDER_MANAGER") {
      items.push({
        path: "/order-manager/orders",
        icon: ShoppingBag,
        label: "Quản lý đơn hàng",
      });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">Trang chủ</span>
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

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === "ADMIN" && "Quản trị viên"}
                  {user?.role === "WAREHOUSE_STAFF" && "Nhân viên kho"}
                  {user?.role === "ORDER_MANAGER" && "Quản lý đơn hàng"}
                </p>
              </div>
              <AlertDialog>
                {/* 1. KÍCH HOẠT: Nút Đăng xuất */}
                <AlertDialogTrigger asChild>
                  {/* Nút này sẽ mở Dialog khi được nhấn */}
                  <Button variant="outline" className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </Button>
                </AlertDialogTrigger>

                {/* 2. NỘI DUNG POPUP XÁC NHẬN */}
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Bạn có chắc chắn muốn đăng xuất?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn sẽ cần đăng nhập lại để truy cập các tính năng bảo mật
                      của tài khoản.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    {/* Nút HỦY: Đóng popup mà không làm gì */}
                    <AlertDialogCancel>Hủy</AlertDialogCancel>

                    {/* Nút HÀNH ĐỘNG: Thực hiện đăng xuất */}
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Xác nhận Đăng xuất
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">Dashboard</span>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
