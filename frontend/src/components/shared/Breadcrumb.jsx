import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeMapping = {
  // Public
  products: "Sản phẩm",
  "tim-kiem": "Tìm kiếm",
  "dien-thoai": "Điện thoại",
  "may-tinh-bang": "Máy tính bảng",
  macbook: "MacBook",
  "tai-nghe": "Tai nghe",
  "apple-watch": "Apple Watch",
  "phu-kien": "Phụ kiện",
  login: "Đăng nhập",
  register: "Đăng ký",

  // Customer
  cart: "Giỏ hàng",
  checkout: "Thanh toán",
  orders: "Đơn hàng",
  profile: "Tài khoản",

  // Admin & Staff
  admin: "Quản trị",
  dashboard: "Bảng điều khiển",
  employees: "Nhân viên",
  promotions: "Khuyến mãi",
  shipping: "Giao hàng",
  warehouse: "Kho hàng",
  "order-manager": "Quản lý đơn hàng",
  pos: "POS Bán hàng",
  "vat-invoices": "Hóa đơn VAT",
  CASHIER: "Thu ngân",
  shipper: "Giao hàng",
};

const Breadcrumb = () => {
  const location = useLocation();

  // ✅ LOG 1: Kiểm tra pathname
  console.log("🔍 [Breadcrumb] Pathname:", location.pathname);

  // Không hiển thị breadcrumb ở các trang cần ẩn
  const pathsToHide = ["/", "/login", "/register"];
  if (pathsToHide.includes(location.pathname)) {
    console.log(
      "❌ [Breadcrumb] Ẩn breadcrumb - pathname nằm trong pathsToHide"
    );
    return null;
  }

  // Tách URL thành mảng
  const pathnames = location.pathname.split("/").filter((x) => x);
  console.log("📍 [Breadcrumb] Pathnames array:", pathnames);

  // Hàm format tên breadcrumb
  const formatBreadcrumbText = (text) => {
    console.log(`  📝 [formatBreadcrumbText] Input: "${text}"`);

    // Kiểm tra routeMapping trước
    if (routeMapping[text]) {
      const mapped = routeMapping[text];
      console.log(`    ✅ Tìm thấy trong routeMapping: "${mapped}"`);
      return mapped;
    }

    // Kiểm tra ID (MongoDB ObjectId hoặc UUID)
    if (text.match(/^[a-f0-9]{24}$/) || text.match(/^[a-f0-9-]{36}$/)) {
      console.log(`    ✅ Là ID: trả về "Chi tiết"`);
      return "Chi tiết";
    }

    // Nếu là số nguyên (trang, số thứ tự)
    if (/^\d+$/.test(text)) {
      const result = `Trang ${text}`;
      console.log(`    ✅ Là số: trả về "${result}"`);
      return result;
    }

    // Format chung: "iphone-15" → "Iphone 15"
    const formatted = text
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    console.log(`    ✅ Format chung: "${formatted}"`);
    return formatted;
  };

  console.log("🎯 [Breadcrumb] Render breadcrumb items:");

  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full bg-slate-50 pl-24 mt-6 items-center py-3 shadow-sm relative top-16 z-40"
    >
      {/* ✅ LOG 2: Thêm background để dễ nhìn thấy component */}
      <ol className="flex flex-wrap items-center text-sm text-gray-500">
        {/* Home Icon */}
        <li>
          <Link
            to="/"
            className="flex items-center hover:text-primary transition-colors"
            title="Trang chủ"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const displayName = formatBreadcrumbText(value);

          console.log(
            `  Item ${index}: value="${value}", to="${to}", displayName="${displayName}", isLast=${isLast}`
          );

          return (
            <React.Fragment key={to}>
              <li className="mx-2">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </li>
              <li>
                {isLast ? (
                  <span className="font-medium text-gray-900 line-clamp-1 max-w-[200px]">
                    {displayName}
                  </span>
                ) : (
                  <Link
                    to={to}
                    className="hover:text-primary transition-colors"
                  >
                    {displayName}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
