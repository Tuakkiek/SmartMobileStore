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

  // Customer - ✅ BỎ "checkout" riêng, xử lý bằng logic đặc biệt
  cart: "Giỏ hàng",
  // checkout: "Thanh toán", // ❌ BỎ DÒNG NÀY
  orders: "Đơn hàng", // ✅ THÊM để /orders/:id hiển thị đẹp
  profile: "Tài khoản",
  payment: "Thanh toán", // ✅ THÊM cho /payment/vnpay/return

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
  cashier: "Thu ngân",
  shipper: "Giao hàng",

  // ✅ THÊM: Xử lý các segment đặc biệt
  vnpay: "VNPay",
  return: "Kết quả thanh toán",
};

const Breadcrumb = () => {
  const location = useLocation();

  // Không hiển thị breadcrumb ở các trang cần ẩn
  const pathsToHide = ["/", "/login", "/register"];
  if (pathsToHide.includes(location.pathname)) {
    return null;
  }

  // Tách URL thành mảng
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Hàm format tên breadcrumb
  const formatBreadcrumbText = (text, pathnames, currentIndex) => {
    // 1. Kiểm tra routeMapping trước
    if (routeMapping[text]) {
      return routeMapping[text];
    }

    // 2. Xử lý trường hợp đặc biệt: /cart/checkout
    if (text === "checkout" && pathnames[currentIndex - 1] === "cart") {
      return "Thanh toán";
    }

    // 3. Xử lý ID (MongoDB ObjectId hoặc UUID)
    if (text.match(/^[a-f0-9]{24}$/) || text.match(/^[a-f0-9-]{36}$/)) {
      // Xác định context dựa vào segment trước
      const previousSegment = pathnames[currentIndex - 1];
      if (previousSegment === "orders") {
        return "Chi tiết đơn hàng";
      }
      return "Chi tiết";
    }

    // 4. Nếu là số nguyên (trang, số thứ tự)
    if (/^\d+$/.test(text)) {
      return `Trang ${text}`;
    }

    // 5. Xử lý slug sản phẩm phức tạp
    if (text.includes("-") && text.match(/\d+(gb|tb)/i)) {
      // VD: "iphone-15-pro-max-256gb"
      const parts = text.split("-");
      const formatted = parts
        .map((part) => {
          // Giữ nguyên số + đơn vị (256gb)
          if (part.match(/^\d+(gb|tb)$/i)) {
            return part.toUpperCase();
          }
          // Capitalize từng từ
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(" ");
      return formatted;
    }

    // 6. Format chung: "iphone-15" → "iPhone 15"
    return text
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // ✅ MOBILE: Chỉ hiển thị 2 item cuối cùng
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const visiblePathnames =
    isMobile && pathnames.length > 2 ? pathnames.slice(-2) : pathnames;

  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full bg-slate-50 px-2 sm:px-4 md:pl-24 mt-6 py-2 sm:py-3 shadow-sm relative top-16 z-30"
    >
      <ol className="flex items-center text-xs sm:text-sm text-gray-500 overflow-x-auto scrollbar-hide">
        {/* Home Icon */}
        <li className="flex-shrink-0">
          <Link
            to="/"
            className="flex items-center hover:text-primary transition-colors"
            title="Trang chủ"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        </li>

        {/* ✅ Hiển thị "..." nếu bị cắt bớt trên mobile */}
        {isMobile && pathnames.length > 2 && (
          <>
            <li className="mx-1 sm:mx-2 flex-shrink-0">
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            </li>
            <li className="flex-shrink-0">
              <span className="text-gray-400">...</span>
            </li>
          </>
        )}

        {visiblePathnames.map((value, index) => {
          const actualIndex =
            isMobile && pathnames.length > 2
              ? pathnames.length - 2 + index
              : index;
          const isLast = actualIndex === pathnames.length - 1;
          const to = `/${pathnames.slice(0, actualIndex + 1).join("/")}`;

          // ✅ TRUYỀN THÊM pathnames và actualIndex vào formatBreadcrumbText
          const displayName = formatBreadcrumbText(
            value,
            pathnames,
            actualIndex
          );

          // ✅ BỎ QUA HIỂN thị những segment không cần thiết
          // VD: /cart/checkout → Chỉ hiển thị "Thanh toán" (không hiển thị "cart" trùng lặp)
          const shouldSkip =
            (value === "cart" && pathnames.includes("checkout")) || // /cart/checkout → bỏ "cart"
            (value === "payment" && pathnames.includes("vnpay")); // /payment/vnpay/return → bỏ "payment"

          if (shouldSkip && !isLast) {
            return null;
          }

          return (
            <React.Fragment key={to}>
              <li className="mx-1 sm:mx-2 flex-shrink-0">
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              </li>
              <li
                className={
                  isLast ? "flex-shrink-0" : "hidden sm:block flex-shrink-0"
                }
              >
                {isLast ? (
                  <span className="font-medium text-gray-900 line-clamp-1 max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                    {displayName}
                  </span>
                ) : (
                  <Link
                    to={to}
                    className="hover:text-primary transition-colors whitespace-nowrap"
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
