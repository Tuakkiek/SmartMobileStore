import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Search, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import SearchOverlay from "@/components/shared/SearchOverlay";
import CategoryDropdown from "@/components/shared/CategoryDropdown";
import Breadcrumb from "@/components/shared/Breadcrumb";

const MainLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categoryMenuRef = useRef(null);

  // Close category menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target)
      ) {
        setCategoryMenuOpen(false);
        setSelectedCategory(null);
      }
    };

    if (categoryMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const handleProfileNavigation = () => {
    if (user?.role === "CUSTOMER") {
      navigate("/profile");
    } else if (user?.role === "ADMIN") {
      navigate("/admin");
    } else if (user?.role === "WAREHOUSE_STAFF") {
      navigate("/warehouse/products");
    } else if (user?.role === "ORDER_MANAGER") {
      navigate("/order-manager/orders");
    } else if (user?.role === "POS_STAFF") {
      navigate("/pos/dashboard");
    } else if (user?.role === "CASHIER") {
      navigate("/CASHIER/dashboard");
    }
    setMobileMenuOpen(false);
  };

  const cartItemCount = getItemCount();

  const handleSearchOpen = () => {
    setSearchOpen(true);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-16 md:pb-0">
      {/* Search Overlay - Tách riêng thành component */}
      <SearchOverlay isOpen={searchOpen} onClose={handleSearchClose} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black text-white py-3 px-4 md:py-4 md:px-6 z-40">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between gap-3">
            {/* Logo */}
            <Link
              to="/"
              className="bg-white rounded-full px-6 py-2.5 flex items-center justify-center"
            >
              <span className="text-black font-bold text-sm">LOGO</span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Bạn muốn..."
                  onClick={handleSearchOpen}
                  readOnly
                  className="w-full bg-white/10 text-white rounded-full py-2 px-4 pr-10 focus:outline-none placeholder-gray-400 text-sm cursor-pointer"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {/* Shopping Cart Icon (Mobile) */}
            {isAuthenticated && user?.role === "CUSTOMER" && (
              <button
                onClick={() => navigate("/cart")}
                className="bg-white text-black rounded-full p-2.5 relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-red-500">
                    {cartItemCount}
                  </Badge>
                )}
              </button>
            )}
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between gap-6">
            {/* Logo */}
            <Link
              to="/"
              className="bg-white rounded-full px-8 py-4 flex items-center justify-center min-w-[180px] transition-all duration-300 hover:bg-gray-200 hover:scale-105"
            >
              <span className="text-black font-bold text-lg transition-colors duration-300 hover:text-gray-700">
                Ninh Kiều iSTORE
              </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative transition-all duration-300 hover:scale-105">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  onClick={handleSearchOpen}
                  readOnly
                  className="w-full bg-white text-black rounded-full py-3 px-6 pr-12 focus:outline-none transition-colors duration-300 hover:bg-gray-100 cursor-pointer"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-black w-5 h-5 transition-colors duration-300 hover:text-gray-700" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Giỏ hàng */}
              {isAuthenticated && user?.role === "CUSTOMER" && (
                <button
                  onClick={() => navigate("/cart")}
                  className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-200 hover:scale-105 relative"
                >
                  <ShoppingCart className="w-5 h-5 transition-colors duration-300 hover:text-gray-700" />
                  <span className="font-medium transition-colors duration-300 hover:text-gray-700">
                    Giỏ hàng
                  </span>
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600 transition-colors duration-300">
                      {cartItemCount}
                    </Badge>
                  )}
                </button>
              )}

              {/* Tài khoản */}
              {isAuthenticated ? (
                <button
                  onClick={handleProfileNavigation}
                  className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-200 hover:scale-105"
                >
                  <User className="w-5 h-5 transition-colors duration-300 hover:text-gray-700" />
                  <span className="font-medium transition-colors duration-300 hover:text-gray-700">
                    {user?.fullName}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-200 hover:scale-105"
                >
                  <User className="w-5 h-5 transition-colors duration-300 hover:text-gray-700" />
                  <span className="font-medium transition-colors duration-300 hover:text-gray-700">
                    Đăng nhập
                  </span>
                </button>
              )}

              {/* Category Dropdown - Component riêng */}
              <CategoryDropdown />
            </div>
          </div>
        </div>
      </header>
      <Breadcrumb />
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div
          className={`grid h-16 ${
            isAuthenticated && user?.role === "CUSTOMER"
              ? "grid-cols-5"
              : "grid-cols-4"
          }`}
        >
          <Link
            to="/"
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-[10px] font-medium">Trang chủ</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Danh mục</span>
          </button>

          {isAuthenticated && user?.role === "CUSTOMER" && (
            <button
              onClick={() => navigate("/cart")}
              className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors relative"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px] font-medium">Cửa hàng</span>
              {cartItemCount > 0 && (
                <Badge className="absolute top-1 right-6 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-red-500">
                  {cartItemCount}
                </Badge>
              )}
            </button>
          )}

          <button className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="text-[10px] font-medium">Thông báo</span>
          </button>

          {isAuthenticated ? (
            <button
              onClick={handleProfileNavigation}
              className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Tài khoản</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Đăng nhập</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl p-4 space-y-2 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h3 className="font-bold text-lg mb-4 px-2">Danh mục</h3>

            {["iPhone", "iPad", "Mac", "AirPods", "Apple Watch"].map(
              (name, idx) => (
                <div key={idx} className="mb-4">
                  <button
                    onClick={() => handleCategoryClick(idx)}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded-lg flex items-center justify-between"
                  >
                    {name}
                    <span
                      className={`transition-transform ${
                        selectedCategory === idx ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {selectedCategory === idx && (
                    <div className="pl-4 mt-2 space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-1 px-4">
                          Dòng {name}
                        </h4>
                        <button className="block w-full text-left px-4 py-1.5 text-xs text-gray-600 hover:text-black hover:bg-gray-50 rounded">
                          {name} Pro Max
                        </button>
                        <button className="block w-full text-left px-4 py-1.5 text-xs text-gray-600 hover:text-black hover:bg-gray-50 rounded">
                          {name} Pro
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            <Link
              to="/products"
              className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tất cả sản phẩm
            </Link>
            <Link
              to="/stores"
              className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tìm cửa hàng
            </Link>

            {isAuthenticated && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                {user?.role === "CUSTOMER" && (
                  <>
                    <Link
                      to="/profile"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Thông tin tài khoản
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Đơn hàng của tôi
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                >
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="bg-white rounded-full px-8 py-4 inline-flex items-center justify-center mb-6">
                <span className="text-black font-bold text-lg">LOGO</span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4 text-gray-400">
                Mua Sắm Và Tìm Hiểu
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Cửa Hàng
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    iPhone
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    iPad
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Mac
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Watch
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Airpods
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4 text-gray-400">
                Tài Khoản
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Quản Lý Tài Khoản Của Bạn
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Tài Khoản Apple Store
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    iCloud.com
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4 text-gray-400">
                Apple Store
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Ứng Dụng Apple Store
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Apple Trade In
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Tài Chính
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Tình Trạng Đơn Hàng
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Hỗ Trợ Mua Hàng
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6">
            <p className="text-xs text-gray-500 text-center md:text-left">
              © 2025 Apple Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
