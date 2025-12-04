// ============================================
// FILE: frontend/src/layouts/MainLayout.jsx
// UPDATED: Integrated CategoryDropdown for mobile menu
// ============================================

import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  MapPin,
  Phone,
  X,
  FacebookIcon,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import SearchOverlay from "@/components/shared/SearchOverlay";
import CategoryDropdown from "@/components/shared/CategoryDropdown";
import Breadcrumb from "@/components/shared/Breadcrumb";

// Store data
const stores = [
  {
    id: 1,
    name: "Ninh Kiều iSTORE - Chi nhánh Trần Hưng Đạo",
    district: "Ninh Kiều",
    address: "123 Trần Hưng Đạo, Phường Cái Khế, Quận Ninh Kiều, TP. Cần Thơ",
    phone: "0292 3831 234",
    hours: "8:00 - 21:00 (Thứ 2 - Chủ Nhật)",
    isMain: true,
  },
  {
    id: 2,
    name: "Ninh Kiều iSTORE - Chi nhánh Mậu Thân",
    district: "Ninh Kiều",
    address: "456 Mậu Thân, Phường An Hòa, Quận Ninh Kiều, TP. Cần Thơ",
    phone: "0292 3831 567",
    hours: "8:00 - 21:00 (Thứ 2 - Chủ Nhật)",
  },
  {
    id: 3,
    name: "Ninh Kiều iSTORE - Vincom Hùng Vương",
    district: "Ninh Kiều",
    address:
      "Vincom Plaza Xuân Khánh, 209 Đường 30/4, Phường Xuân Khánh, Quận Ninh Kiều",
    phone: "0292 3831 890",
    hours: "9:00 - 22:00 (Thứ 2 - Chủ Nhật)",
  },
  {
    id: 4,
    name: "Ninh Kiều iSTORE - Cái Răng",
    district: "Cái Răng",
    address:
      "789 Trần Hoàng Na, Phường Thường Thạnh, Quận Cái Răng, TP. Cần Thơ",
    phone: "0292 3832 123",
    hours: "8:00 - 21:00 (Thứ 2 - Chủ Nhật)",
  },
  {
    id: 5,
    name: "Ninh Kiều iSTORE - Bình Thủy",
    district: "Bình Thủy",
    address: "321 Bùi Hữu Nghĩa, Phường Bình Thủy, Quận Bình Thủy, TP. Cần Thơ",
    phone: "0292 3832 456",
    hours: "8:00 - 20:00 (Thứ 2 - Chủ Nhật)",
  },
  {
    id: 6,
    name: "Ninh Kiều iSTORE - Ô Môn",
    district: "Ô Môn",
    address: "654 Quốc Lộ 91B, Phường Châu Văn Liêm, Quận Ô Môn, TP. Cần Thơ",
    phone: "0292 3832 789",
    hours: "8:00 - 20:00 (Thứ 2 - Chủ Nhật)",
  },
];

const districts = ["Tất cả", "Ninh Kiều", "Cái Răng", "Bình Thủy", "Ô Môn"];

const MainLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();

  // Mobile menus
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Desktop menus
  const [desktopStoreMenuOpen, setDesktopStoreMenuOpen] = useState(false);
  const [desktopSelectedDistrict, setDesktopSelectedDistrict] = useState(0);

  // Store menu
  const [selectedDistrict, setSelectedDistrict] = useState(0);

  const cartItemCount = getItemCount();

  // Prevent body scroll when any menu is open
  useEffect(() => {
    if (storeMenuOpen || contactMenuOpen || desktopStoreMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [storeMenuOpen, contactMenuOpen, desktopStoreMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleProfileNavigation = () => {
    if (user?.role === "CUSTOMER") navigate("/profile");
    else if (user?.role === "ADMIN") navigate("/admin");
    else if (user?.role === "WAREHOUSE_STAFF") navigate("/warehouse/products");
    else if (user?.role === "ORDER_MANAGER") navigate("/order-manager/orders");
    else if (user?.role === "POS_STAFF") navigate("/pos/dashboard");
    else if (user?.role === "CASHIER") navigate("/CASHIER/dashboard");
  };

  const filteredStores =
    selectedDistrict === 0
      ? stores
      : stores.filter(
          (store) => store.district === districts[selectedDistrict]
        );

  return (
    <div className="min-h-screen flex flex-col relative pb-16 md:pb-0">
      {/* Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black text-white py-3 px-4 md:py-4 md:px-6 z-40">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between gap-3">
            <Link
              to="/"
              className="bg-white rounded-full px-6 py-2.5 flex items-center justify-center"
            >
              <span className="text-black font-bold text-sm">LOGO</span>
            </Link>

            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Bạn muốn..."
                  onClick={() => setSearchOpen(true)}
                  readOnly
                  className="w-full bg-white/10 text-white rounded-full py-2 px-4 pr-10 focus:outline-none placeholder-gray-400 text-sm cursor-pointer"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

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
            <Link
              to="/"
              className="bg-white rounded-full px-8 py-4 flex items-center justify-center min-w-[180px] transition-all duration-300 hover:bg-gray-200 hover:scale-105"
            >
              <span className="text-black font-bold text-lg transition-colors duration-300 hover:text-gray-700">
                Ninh Kiều iSTORE
              </span>
            </Link>

            <div className="flex-1 max-w-md">
              <div className="relative transition-all duration-300 hover:scale-105">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  onClick={() => setSearchOpen(true)}
                  readOnly
                  className="w-full bg-white text-black rounded-full py-3 px-6 pr-12 focus:outline-none transition-colors duration-300 hover:bg-gray-100 cursor-pointer"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-black w-5 h-5 transition-colors duration-300 hover:text-gray-700" />
              </div>
            </div>

            <div className="flex items-center gap-3">
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
            onClick={() => setCategoryMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Danh mục</span>
          </button>

          {isAuthenticated && user?.role === "CUSTOMER" && (
            <button
              onClick={() => setStoreMenuOpen(!storeMenuOpen)}
              className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              <span className="text-[10px] font-medium">Cửa hàng</span>
            </button>
          )}

          <button
            onClick={() => setContactMenuOpen(!contactMenuOpen)}
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px] font-medium">Liên hệ</span>
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

      {/* Mobile Category Menu - Using CategoryDropdown */}
      {categoryMenuOpen && (
        <div className="md:hidden">
          <CategoryDropdown
            isMobileMenu={true}
            isOpen={categoryMenuOpen}
            onClose={() => setCategoryMenuOpen(false)}
          />
        </div>
      )}

      {/* Mobile Store Menu */}
      {storeMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bottom-16 z-50 bg-black/50"
          onClick={() => setStoreMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white text-gray-900 p-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-red-500" />
                <span className="text-lg font-semibold">Cửa hàng</span>
              </div>
              <button
                onClick={() => setStoreMenuOpen(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 bg-gray-50 overflow-y-auto border-r border-gray-200">
                {districts.map((districtName, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDistrict(idx)}
                    className={`w-full text-left px-3 py-4 border-b border-gray-200 transition-colors ${
                      selectedDistrict === idx
                        ? "bg-white text-black font-semibold"
                        : "text-gray-600 hover:text-black hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-xs font-medium">{districtName}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-white overflow-y-auto">
                <div className="p-4">
                  <h2 className="text-gray-900 text-lg font-bold mb-4">
                    {districts[selectedDistrict]}
                  </h2>
                  {filteredStores.length > 0 ? (
                    <div className="space-y-3">
                      {filteredStores.map((store) => (
                        <div
                          key={store.id}
                          className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="bg-white rounded-lg p-2 flex-shrink-0 border border-gray-200">
                              <MapPin className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-gray-900 text-sm font-semibold mb-1 flex items-center gap-2">
                                {store.name}
                                {store.isMain && (
                                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                                    Chính
                                  </span>
                                )}
                              </h3>
                              <p className="text-gray-600 text-xs">
                                Quận {store.district}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-700 text-xs leading-relaxed">
                                {store.address}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <a
                                href={`tel:${store.phone}`}
                                className="text-blue-600 text-xs hover:underline"
                              >
                                {store.phone}
                              </a>
                            </div>
                            <div className="flex items-start gap-2">
                              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-700 text-xs">
                                {store.hours}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                store.address
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-black text-white rounded-full py-2 px-4 text-xs font-semibold hover:bg-gray-800 transition-colors text-center"
                            >
                              Chỉ đường
                            </a>
                            <a
                              href={`tel:${store.phone}`}
                              className="flex-1 bg-white text-black rounded-full py-2 px-4 text-xs font-semibold hover:bg-gray-100 transition-colors text-center border border-gray-300"
                            >
                              Gọi ngay
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <MapPin className="w-16 h-16 mb-4" />
                      <p className="text-sm">Không có cửa hàng</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Contact Menu */}
      {contactMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bottom-16 z-50 bg-black/50"
          onClick={() => setContactMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white text-gray-900 p-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-red-500" />
                <div>
                  <span className="text-lg font-semibold">Tổng đài hỗ trợ</span>
                  <p className="text-xs text-gray-600">(Từ 8:00-21:00)</p>
                </div>
              </div>
              <button
                onClick={() => setContactMenuOpen(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white p-4">
              <div className="space-y-3">
                <a
                  href="tel:1900633909"
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors block"
                >
                  <p className="text-gray-600 text-xs mb-2">
                    Hotline bán hàng:
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-bold text-base">
                      1900.633.909 (Bấm phím 1)
                    </span>
                  </div>
                </a>
                <a
                  href="tel:0932640089"
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors block"
                >
                  <p className="text-gray-600 text-xs mb-2">
                    Khách hàng doanh nghiệp:
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-bold text-base">
                      0932.640.089
                    </span>
                  </div>
                </a>
                <a
                  href="tel:1900633909"
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors block"
                >
                  <p className="text-gray-600 text-xs mb-2">
                    Hotline bảo hành, kỹ thuật:
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-bold text-base">
                      1900.633.909 (Bấm phím 2)
                    </span>
                  </div>
                </a>
                <a
                  href="tel:1900633909"
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors block"
                >
                  <p className="text-gray-600 text-xs mb-2">
                    Hotline hỗ trợ phần mềm:
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-bold text-base">
                      1900.633.909 (Bấm phím 3)
                    </span>
                  </div>
                </a>
                <a
                  href="tel:0977649939"
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors block"
                >
                  <p className="text-gray-600 text-xs mb-2">
                    Hotline tư vấn trả góp:
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-bold text-base">
                      0977.649.939
                    </span>
                  </div>
                </a>
                <a
                  href="tel:0981000731"
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors block"
                >
                  <p className="text-gray-600 text-xs mb-2">
                    Hotline phản ánh chất lượng dịch vụ:
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-bold text-base">
                      0981.000.731
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Store Menu Overlay */}
      {desktopStoreMenuOpen && (
        <div
          className="hidden md:block fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setDesktopStoreMenuOpen(false)}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black rounded-2xl w-full max-w-5xl max-h-[85vh] flex overflow-hidden shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-black/95 backdrop-blur-sm text-white p-6 flex items-center justify-between border-b border-gray-800 z-10">
              <div className="flex items-center gap-4">
                <MapPin className="w-7 h-7" />
                <span className="text-2xl font-semibold">
                  Hệ Thống Cửa Hàng
                </span>
              </div>
              <button
                onClick={() => setDesktopStoreMenuOpen(false)}
                className="text-white hover:text-gray-400 transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Main Content */}
            <div className="flex w-full mt-20">
              {/* Left Sidebar - Districts */}
              <div className="w-64 bg-neutral-900 overflow-y-auto border-r border-gray-800">
                {districts.map((districtName, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDesktopSelectedDistrict(idx)}
                    className={`w-full text-left px-6 py-4 border-b border-gray-800 transition-all duration-200 ${
                      desktopSelectedDistrict === idx
                        ? "bg-black text-white font-semibold"
                        : "text-gray-400 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <span className="text-sm">{districtName}</span>
                  </button>
                ))}
              </div>

              {/* Right Content - Stores */}
              <div className="flex-1 bg-black overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-white text-xl font-bold mb-6">
                    {districts[desktopSelectedDistrict]}
                  </h2>

                  {(desktopSelectedDistrict === 0
                    ? stores
                    : stores.filter(
                        (store) =>
                          store.district === districts[desktopSelectedDistrict]
                      )
                  ).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {(desktopSelectedDistrict === 0
                        ? stores
                        : stores.filter(
                            (store) =>
                              store.district ===
                              districts[desktopSelectedDistrict]
                          )
                      ).map((store) => (
                        <div
                          key={store.id}
                          className="bg-neutral-900 rounded-xl p-5 border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:shadow-lg"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            <div className="bg-white rounded-lg p-2.5 flex-shrink-0">
                              <MapPin className="w-6 h-6 text-red-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-white text-base font-semibold mb-1 flex items-center gap-2 flex-wrap">
                                {store.name}
                                {store.isMain && (
                                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    Chính
                                  </span>
                                )}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                Quận {store.district}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* Address */}
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {store.address}
                              </p>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <a
                                href={`tel:${store.phone}`}
                                className="text-blue-400 text-sm hover:underline"
                              >
                                {store.phone}
                              </a>
                            </div>

                            {/* Hours */}
                            <div className="flex items-start gap-2">
                              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                              <p className="text-gray-300 text-sm">
                                {store.hours}
                              </p>
                            </div>
                          </div>

                          {/* Buttons */}
                          <div className="mt-4 pt-4 border-t border-gray-800 flex gap-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                store.address
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-white text-black rounded-full py-2.5 px-4 text-sm font-semibold hover:bg-gray-200 transition-colors text-center"
                            >
                              Chỉ đường
                            </a>

                            <a
                              href={`tel:${store.phone}`}
                              className="flex-1 bg-neutral-800 text-white rounded-full py-2.5 px-4 text-sm font-semibold hover:bg-neutral-700 transition-colors text-center border border-gray-700"
                            >
                              Gọi ngay
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                      <MapPin className="w-20 h-20 mb-4" />
                      <p className="text-base">
                        Không có cửa hàng trong khu vực này
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
                <span className="text-black font-bold text-lg">
                  Ninh Kiều iSTORE
                </span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://twitter.com/Apple"
                  target="_blank"
                  rel="noopener noreferrer"
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
                  href="https://www.instagram.com/apple/"
                  target="_blank"
                  rel="noopener noreferrer"
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
                  href="https://www.youtube.com/user/Apple"
                  target="_blank"
                  rel="noopener noreferrer"
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
                  href="https://www.linkedin.com/company/apple/"
                  target="_blank"
                  rel="noopener noreferrer"
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
                <a
                  href="https://www.facebook.com/apple"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <FacebookIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4 text-gray-400">
                Mua Sắm Và Tìm Hiểu
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => setDesktopStoreMenuOpen(true)}
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Cửa Hàng
                  </button>
                </li>
                <li>
                  <Link
                    to="/products?category=iPhone"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    iPhone
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=iPad"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    iPad
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=Mac"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Mac
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=AppleWatch"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Watch
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products?category=AirPods"
                    className="text-sm text-white hover:text-gray-400 transition-colors"
                  >
                    Airpods
                  </Link>
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
