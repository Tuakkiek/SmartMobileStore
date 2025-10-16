import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { productAPI } from "@/lib/api";

const MainLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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
    }
    setMobileMenuOpen(false);
  };

  const cartItemCount = getItemCount();

  // Tìm kiếm sản phẩm khi user gõ
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim() && searchOpen) {
        setIsSearching(true);
        try {
          const response = await productAPI.getAll({
            search: searchQuery,
            limit: 6,
          });
          setSearchResults(response.data.data.products);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, searchOpen]);

  // Đóng search khi nhấn ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleSearchOpen = () => {
    setSearchOpen(true);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`);
    handleSearchClose();
  };

  const quickLinks = [
    { name: "Tìm cửa hàng", path: "/stores" },
    { name: "Apple Vision Pro", path: "/products?category=vision" },
    { name: "AirPods", path: "/products?category=airpods" },
    { name: "Apple Intelligence", path: "/products?category=intelligence" },
    { name: "Apple Trade In", path: "/trade-in" },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Search Overlay */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          searchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
  
      >
        {/* Backdrop với blur */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={handleSearchClose}
        />

        {/* Search Container - Animation slide down */}
        <div
          className={`absolute top-0 left-0 right-0 bg-black shadow-2xl transform transition-all duration-500 ease-out ${
            searchOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
          style={{ transformOrigin: "top" }}
        >
          <div className="relative z-10">
            <div className="max-w-4xl mx-auto px-6 py-8">
              {/* Search Input */}
              <div className="relative mb-8">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search apple.com"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-900/50 text-gray-300 rounded-lg py-4 pl-12 pr-6 focus:outline-none focus:bg-gray-900 placeholder-gray-500 transition-colors"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSearchClose}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Quick Links */}
              {!searchQuery && (
                <div className="mb-8">
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                    Quick Links
                  </h3>
                  <div className="space-y-1">
                    {quickLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={handleSearchClose}
                        className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors py-2.5 px-2 rounded-lg hover:bg-gray-900/30 group"
                      >
                        <span className="text-gray-600 group-hover:text-blue-500 transition-colors text-sm">
                          →
                        </span>
                        <span className="text-sm">{link.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div>
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                    {isSearching ? "Đang tìm kiếm..." : "Kết quả tìm kiếm"}
                  </h3>
                  {searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {searchResults.map((product) => (
                        <button
                          key={product._id}
                          onClick={() => handleProductClick(product._id)}
                          className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-all text-left"
                        >
                          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Search className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate text-sm">
                              {product.name}
                            </h4>
                            <p className="text-gray-500 text-xs truncate">
                              {product.model}
                            </p>
                            <p className="text-blue-400 text-sm font-semibold mt-1">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(product.price)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !isSearching ? (
                    <p className="text-gray-500 text-center py-12 text-sm">
                      Không tìm thấy sản phẩm phù hợp
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-black text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Logo */}
          <Link
            to="/"
            className="bg-white rounded-full px-8 py-4 flex items-center justify-center min-w-[180px] transition-all duration-300 hover:bg-gray-200 hover:scale-105"
          >
            <span className="text-black font-bold text-lg transition-colors duration-300 hover:text-gray-700">
              LOGO
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

            {/* Danh mục */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:bg-gray-200 hover:scale-105"
            >
              <Menu className="w-5 h-5 transition-colors duration-300 hover:text-gray-700" />
              <span className="font-medium transition-colors duration-300 hover:text-gray-700">
                Danh mục
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 bg-black border-t border-gray-700">
            <Link
              to="/"
              className="block px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              Trang chủ
            </Link>
            <Link
              to="/products"
              className="block px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sản phẩm
            </Link>
            {isAuthenticated ? (
              <>
                {user?.role === "CUSTOMER" && (
                  <>
                    <Link
                      to="/cart"
                      className="block px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Giỏ hàng ({cartItemCount})
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Tài khoản
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo */}
            <div className="flex items-start">
              <div className="bg-white rounded-full px-8 py-4 flex items-center justify-center">
                <span className="text-black font-bold text-lg">LOGO</span>
              </div>
            </div>

            {/* Hệ thống cửa hàng */}
            <div>
              <h3 className="font-bold text-lg mb-4">Hệ thống cửa hàng</h3>
              <ul className="space-y-2 text-sm">
                <li>CN 1:</li>
                <li>CN 2:</li>
                <li>CN 3:</li>
                <li>CN 4:</li>
              </ul>
            </div>

            {/* Chính sách bán hàng */}
            <div>
              <h3 className="font-bold text-lg mb-4">Chính sách bán hàng</h3>
              <ul className="space-y-2 text-sm">
                <li>Chính sách bảo hành</li>
                <li>Chính sách mua online</li>
                <li>Chính sách bảo mật thông tin khách hàng</li>
              </ul>
            </div>

            {/* Hotline hỗ trợ */}
            <div>
              <h3 className="font-bold text-lg mb-4">Hotline hỗ trợ</h3>
              <ul className="space-y-2 text-sm">
                <li>Hotline bán hàng: 0123456789</li>
                <li>Hotline tư vấn trả góp: 0123456789</li>
                <li>Hotline bảo hành, kỹ thuật: 0123456789</li>
                <li>Hotline phản ánh: 0123456789</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;