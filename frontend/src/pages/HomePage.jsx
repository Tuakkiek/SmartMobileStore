// frontend/src/pages/HomePage.jsx
// ĐÃ SỬA: Thêm CategoryNav component

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Box,
} from "lucide-react";
import { HeroBannerCarousel } from "@/components/shared/HeroBanner";
import ProductCard from "@/components/shared/ProductCard";
import IPhoneShowcase from "@/components/shared/iPhoneShowcase";
import { Loading } from "@/components/shared/Loading";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
  analyticsAPI,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

// ============================================
// CATEGORY CONFIGURATION
// ============================================
const CATEGORY_ICONS = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Laptop,
  AppleWatch: Watch,
  AirPods: Headphones,
  Accessories: Box,
};

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AppleWatch: appleWatchAPI,
  AirPods: airPodsAPI,
  Accessories: accessoryAPI,
};

const categories = Object.keys(CATEGORY_ICONS);

// ============================================
// MAIN COMPONENT
// ============================================
const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [categoryProducts, setCategoryProducts] = useState({});
  const [topSellersMap, setTopSellersMap] = useState({});
  const [newArrivals, setNewArrivals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin =
    isAuthenticated &&
    ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user?.role);

  // ============================================
  // FETCH DATA – Dùng useCallback để tái sử dụng
  // ============================================
  const fetchHomeData = useCallback(async () => {
    setIsLoading(true);
    const allProducts = {};
    const topSellers = {};

    try {
      await Promise.all(
        categories.map(async (cat) => {
          const api = API_MAP[cat];
          if (!api?.getAll) return;

          try {
            const productsRes = await api.getAll({ limit: 8 });
            const products =
              productsRes.data?.data?.products || productsRes.data || [];

            let sellerIds = [];
            try {
              const sellersRes = await analyticsAPI.getTopSellers(cat, 10);
              const data = sellersRes.data?.data || sellersRes.data;
              sellerIds = Array.isArray(data)
                ? data.map((s) => s.productId).filter(Boolean)
                : [];
            } catch (err) {
              console.warn(`Top sellers failed for ${cat}:`, err);
            }

            allProducts[cat] = Array.isArray(products) ? products : [];
            topSellers[cat] = sellerIds;
          } catch (error) {
            console.error(`Error fetching ${cat}:`, error);
            allProducts[cat] = [];
            topSellers[cat] = [];
          }
        })
      );

      const allProductsList = Object.values(allProducts).flat();
      const sortedNewArrivals = [...allProductsList]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

      setNewArrivals(sortedNewArrivals);
      setCategoryProducts(allProducts);
      setTopSellersMap(topSellers);
    } catch (err) {
      console.error("Lỗi tải trang chủ:", err);
      toast.error("Không thể tải dữ liệu trang chủ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // ============================================
  // TOP NEW IDS PER CATEGORY
  // ============================================
  const getTopNewIds = (products) => {
    if (!Array.isArray(products) || products.length === 0) return [];
    return [...products]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((p) => p._id)
      .filter(Boolean);
  };

  // ============================================
  // HANDLE EDIT & DELETE
  // ============================================
  const handleEdit = (product) => {
    navigate(`/warehouse/products?edit=${product._id}`, { state: { product } });
  };

  const handleDelete = async (productId, category) => {
    if (!window.confirm("Xác nhận xóa sản phẩm này?")) return;

    const api = API_MAP[category];
    if (!api?.delete) {
      toast.error("Không hỗ trợ xóa sản phẩm này");
      return;
    }

    try {
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");

      setCategoryProducts((prev) => ({
        ...prev,
        [category]: prev[category]?.filter((p) => p._id !== productId) || [],
      }));

      setNewArrivals((prev) => prev.filter((p) => p._id !== productId));
      fetchHomeData(); // Refresh UI
    } catch (error) {
      console.error("Xóa thất bại:", error);
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleViewAll = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  // ============================================
  // CATEGORY SECTION
  // ============================================
  const CategorySection = ({ category, products }) => {
    const Icon = CATEGORY_ICONS[category] || Box;
    if (!Array.isArray(products) || products.length === 0) return null;

    const topNewIds = getTopNewIds(products);
    const topSellerIds = topSellersMap[category] || [];

    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold text-gray-900">{category}</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewAll(category)}
            >
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <div key={product._id} className="relative group">
                <ProductCard
                  key={product._id}
                  product={{
                    ...product,
                    isTopNew: topNewIds.includes(product._id),
                    isTopSeller: topSellerIds.includes(product._id),
                  }}
                  isTopNew={topNewIds.includes(product._id)}
                  isTopSeller={topSellerIds.includes(product._id)}
                  onEdit={isAdmin ? () => handleEdit(product) : undefined}
                  onDelete={
                    isAdmin
                      ? () => handleDelete(product._id, category)
                      : undefined
                  }
                  onUpdate={fetchHomeData}
                  showVariantsBadge={true}
                  showAdminActions={isAdmin}
                  editingProductId={null}
                  showForm={false}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // ============================================
  // CATEGORY NAVIGATION ← ĐÃ THÊM
  // ============================================
  const CategoryNav = () => (
    <section className="py-10 bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Box;
            const productCount = categoryProducts[cat]?.length || 0;

            return (
              <button
                key={cat}
                onClick={() => handleViewAll(cat)}
                className="group flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
              >
                <Icon className="w-9 h-9 text-primary group-hover:text-white transition-colors" />
                <div className="text-center">
                  <span className="text-sm font-medium group-hover:text-white block">
                    {cat}
                  </span>
                  {productCount > 0 && (
                    <span className="text-xs text-muted-foreground group-hover:text-white/80">
                      {productCount} sản phẩm
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );

  // ============================================
  // NEW ARRIVALS SECTION
  // ============================================
  const NewArrivalsSection = () => {
    if (!Array.isArray(newArrivals) || newArrivals.length === 0) return null;

    return (
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sản phẩm mới</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/products?sort=createdAt")}
            >
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product) => {
              const productCategory =
                Object.keys(categoryProducts).find((cat) =>
                  categoryProducts[cat]?.some((p) => p._id === product._id)
                ) || null;

              return (
                <div key={product._id} className="relative group">
                  <ProductCard
                    key={product._id}
                    product={{
                      ...product,
                      isTopNew: true,
                    }}
                    isTopNew={true}
                    isTopSeller={false}
                    onEdit={isAdmin ? () => handleEdit(product) : undefined}
                    onDelete={
                      isAdmin && productCategory
                        ? () => handleDelete(product._id, productCategory)
                        : undefined
                    }
                    onUpdate={fetchHomeData}
                    showVariantsBadge={true}
                    showAdminActions={isAdmin}
                    editingProductId={null}
                    showForm={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroBannerCarousel />
      <CategoryNav /> {/* ← BÂY GIỜ ĐÃ ĐƯỢC KHAI BÁO */}
      <NewArrivalsSection />
      {categories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          products={categoryProducts[cat] || []}
        />
      ))}
      {categoryProducts.iPhone?.length > 0 && <IPhoneShowcase />}
    </div>
  );
};

export default HomePage;
