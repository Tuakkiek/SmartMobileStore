import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

// Từ điển ánh xạ URL sang tên hiển thị tiếng Việt
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

  // Không hiện breadcrumb ở trang chủ
  if (location.pathname === "/") return null;

  // Tách URL thành mảng
  const pathnames = location.pathname.split("/").filter((x) => x);

  const formatBreadcrumbText = (text) => {
    if (routeMapping[text]) return routeMapping[text];
    // Nếu là ID dài (số + chữ), hiển thị rút gọn
    if (text.length > 20 && /\d/.test(text)) return "Chi tiết";
    // Format text thường: "iphone-15" -> "Iphone 15"
    return text.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <nav aria-label="Breadcrumb" className="w-full py-2 mb-4">
      <ol className="flex flex-wrap items-center text-sm text-gray-500">
        {/* Home Icon */}
        <li>
          <Link
            to="/"
            className="flex items-center hover:text-primary transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const displayName = formatBreadcrumbText(value);

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
