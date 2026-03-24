import {
  Boxes,
  ClipboardList,
  FileText,
  History,
  Layers,
  Layout,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackagePlus,
  Percent,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Tags,
  TrendingUp,
  Truck,
  Users,
  Video,
  Warehouse,
} from "lucide-react";

export const getRoleLabel = (role) => {
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

export const getDashboardNavigation = ({ user, authz }) => {
  const items = [];
  const role = String(user?.role || "").toUpperCase();
  const permissionSet = new Set(
    Array.isArray(authz?.permissions) ? authz.permissions : [],
  );
  const isGlobalAdmin = Boolean(authz?.isGlobalAdmin || role === "GLOBAL_ADMIN");
  const hasPermission = (key) => permissionSet.has(key);
  const hasAnyPermission = (keys = []) => keys.some((key) => hasPermission(key));
  const addItem = (item) => {
    if (!items.some((existing) => existing.path === item.path)) {
      items.push(item);
    }
  };

  const canManageUsers =
    hasPermission("*") ||
    hasPermission("users.manage.branch") ||
    hasPermission("users.manage.global");

  if (role === "ADMIN" || role === "GLOBAL_ADMIN") {
    items.push(
      { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { path: "/admin/stores", icon: Store, label: "Quản lý cửa hàng" },
      { path: "/admin/inventory-dashboard", icon: Boxes, label: "Tổng quan kho" },
      { path: "/admin/stock-in", icon: PackagePlus, label: "Nhập kho" },
      { path: "/admin/employees", icon: Users, label: "Quản lý nhân viên" },
      { path: "/admin/brands", icon: Tags, label: "Quản lý hãng" },
      { path: "/admin/product-types", icon: Layers, label: "Loại sản phẩm" },
      { path: "/admin/promotions", icon: Percent, label: "Khuyến mãi" },
      { path: "/admin/homepage-editor", icon: Layout, label: "Giao diện trang chủ" },
      { path: "/admin/short-videos", icon: Video, label: "Video ngắn" },
      { path: "/admin/warehouse-config", icon: Warehouse, label: "Cấu hình kho" },
      { path: "/warehouse/products", icon: Smartphone, label: "Sản phẩm" },
      { path: "/warehouse-staff", icon: Package, label: "Dashboard kho" },
      { path: "/warehouse-staff/receive-goods", icon: PackageCheck, label: "Nhận hàng" },
      { path: "/warehouse-staff/pick-orders", icon: ClipboardList, label: "Xuất kho" },
      { path: "/warehouse-staff/transfer", icon: RefreshCw, label: "Chuyển kho" },
      { path: "/order-manager/orders", icon: ShoppingBag, label: "Đơn hàng" },
      { path: "/shipper/dashboard", icon: Truck, label: "Giao hàng" },
      { path: "/pos/dashboard", icon: Receipt, label: "POS - Bán hàng" },
      { path: "/pos/orders", icon: History, label: "Lịch sử POS" },
      { path: "/CASHIER/dashboard", icon: TrendingUp, label: "Thu ngân" },
      { path: "/CASHIER/vat-invoices", icon: FileText, label: "Hóa đơn" },
    );

    if (isGlobalAdmin) {
      items.push({ path: "/admin/audit-logs", icon: ShieldCheck, label: "Audit Logs" });
    }
  } else if (role === "WAREHOUSE_MANAGER") {
    items.push(
      { path: "/warehouse-staff", icon: Package, label: "Dashboard kho" },
      { path: "/warehouse-staff/receive-goods", icon: PackageCheck, label: "Nhận hàng" },
      { path: "/warehouse-staff/pick-orders", icon: ClipboardList, label: "Xuất kho" },
      { path: "/warehouse-staff/transfer", icon: RefreshCw, label: "Chuyển kho" },
      { path: "/admin/warehouse-config", icon: Warehouse, label: "Cấu hình kho" },
    );
  } else if (role === "WAREHOUSE_STAFF") {
    items.push(
      { path: "/warehouse-staff", icon: Package, label: "Dashboard kho" },
      { path: "/warehouse-staff/receive-goods", icon: PackageCheck, label: "Nhận hàng" },
      { path: "/warehouse-staff/pick-orders", icon: ClipboardList, label: "Xuất kho" },
      { path: "/warehouse-staff/transfer", icon: RefreshCw, label: "Chuyển kho" },
    );
  } else if (role === "PRODUCT_MANAGER") {
    items.push({
      path: "/warehouse/products",
      icon: ShoppingBag,
      label: "Quản lý sản phẩm",
    });
  } else if (role === "ORDER_MANAGER") {
    items.push({
      path: "/order-manager/orders",
      icon: ShoppingBag,
      label: "Quản lý đơn hàng",
    });
  } else if (role === "SHIPPER") {
    items.push({
      path: "/shipper/dashboard",
      icon: Truck,
      label: "Giao hàng",
    });
  } else if (role === "POS_STAFF") {
    items.push(
      { path: "/pos/dashboard", icon: Receipt, label: "Bán hàng" },
      { path: "/pos/orders", icon: History, label: "Lịch sử đơn hàng" },
    );
  } else if (role === "CASHIER") {
    items.push(
      { path: "/CASHIER/dashboard", icon: TrendingUp, label: "Doanh thu" },
      { path: "/CASHIER/vat-invoices", icon: FileText, label: "Hóa đơn" },
    );
  }

  // Support hybrid users in EXPLICIT mode (for example POS + warehouse grants).
  const canAccessWarehouseDashboard =
    hasPermission("*") ||
    hasAnyPermission([
      "warehouse.read",
      "warehouse.write",
      "inventory.read",
      "inventory.write",
      "transfer.read",
      "transfer.create",
      "transfer.approve",
      "transfer.ship",
      "transfer.receive",
    ]);
  const canAccessWarehouseProducts =
    hasPermission("*") ||
    hasAnyPermission([
      "product.create",
      "product.update",
      "product.delete",
    ]);
  const canAccessWarehouseReceive =
    hasPermission("*") ||
    hasAnyPermission(["warehouse.write", "inventory.write"]);
  const canAccessWarehousePick =
    hasPermission("*") ||
    hasAnyPermission(["orders.read", "warehouse.read", "inventory.read"]);
  const canAccessWarehouseTransfer =
    hasPermission("*") ||
    hasAnyPermission([
      "transfer.read",
      "transfer.create",
      "transfer.approve",
      "transfer.ship",
      "transfer.receive",
    ]);

  if (canAccessWarehouseProducts) {
    addItem({ path: "/warehouse/products", icon: Smartphone, label: "Sản phẩm" });
  }
  if (canAccessWarehouseDashboard) {
    addItem({ path: "/warehouse-staff", icon: Package, label: "Dashboard kho" });
  }
  if (canAccessWarehouseReceive) {
    addItem({
      path: "/warehouse-staff/receive-goods",
      icon: PackageCheck,
      label: "Nhận hàng",
    });
  }
  if (canAccessWarehousePick) {
    addItem({
      path: "/warehouse-staff/pick-orders",
      icon: ClipboardList,
      label: "Xuất kho",
    });
  }
  if (canAccessWarehouseTransfer) {
    addItem({ path: "/warehouse-staff/transfer", icon: RefreshCw, label: "Chuyển kho" });
  }

  if (canManageUsers) {
    addItem({ path: "/admin/employees", icon: Users, label: "Quản lý nhân viên" });
  }

  return items;
};
