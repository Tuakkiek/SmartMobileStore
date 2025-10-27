// frontend/src/pages/HomePage.jsx
// ✅ REFACTORED: Lấy sản phẩm theo từng category riêng biệt như ProductsPage

import React, { useEffect, useState } from "react";
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
  // FETCH DATA FOR ALL CATEGORIES
  // ============================================
  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      const allProducts = {};
      const topSellers = {};

      try {
        // ✅ FETCH PRODUCTS BY CATEGORY (giống warehouse)
        await Promise.all(
          categories.map(async (cat) => {
            const api = API_MAP[cat];
            if (!api || !api.getAll) {
              console.warn(`API not configured for ${cat}`);
              return;
            }

            try {
              // Fetch products for this category
              const productsRes = await api.getAll({ limit: 8 });
              const products =
                productsRes.data?.data?.products || productsRes.data || [];

              // Fetch top sellers for this category
              const sellersRes = await analyticsAPI.getTopSellers(cat, 10);
              const sellerIds =
                sellersRes.data?.data?.map((s) => s.productId) || [];

              allProducts[cat] = Array.isArray(products) ? products : [];
              topSellers[cat] = sellerIds;

              console.log(`✅ Fetched ${products.length} products for ${cat}`);
            } catch (error) {
              console.error(`❌ Error fetching ${cat}:`, error);
              allProducts[cat] = [];
              topSellers[cat] = [];
            }
          })
        );

        // ✅ GET TOP 10 NEWEST ACROSS ALL CATEGORIES
        const allProductsList = Object.values(allProducts).flat();
        const sortedByDate = [...allProductsList].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setNewArrivals(sortedByDate.slice(0, 8));

        setCategoryProducts(allProducts);
        setTopSellersMap(topSellers);

        console.log("✅ Home data loaded successfully");
      } catch (err) {
        console.error("❌ Lỗi tải trang chủ:", err);
        toast.error("Không thể tải dữ liệu trang chủ");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // ============================================
  // CALCULATE TOP NEW FOR EACH CATEGORY
  // ============================================
  const getTopNewIds = (products) => {
    if (!products || products.length === 0) return [];
    const sorted = [...products].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return sorted.slice(0, 10).map((p) => p._id);
  };

  // ============================================
  // HANDLE EDIT & DELETE (ADMIN ONLY)
  // ============================================
  const handleEdit = (product) => {
    navigate(`/warehouse/products?edit=${product._id}`, { state: { product } });
  };

  const handleDelete = async (productId, category) => {
    if (!window.confirm("Xác nhận xóa sản phẩm này?")) return;

    try {
      const api = API_MAP[category];
      if (!api || !api.delete) {
        throw new Error(`API for ${category} not configured`);
      }

      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");

      // Update state
      setCategoryProducts((prev) => ({
        ...prev,
        [category]: prev[category].filter((p) => p._id !== productId),
      }));

      setNewArrivals((prev) => prev.filter((p) => p._id !== productId));
    } catch (error) {
      console.error("❌ Xóa thất bại:", error);
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleViewAll = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  // ============================================
  // CATEGORY SECTION COMPONENT
  // ============================================
  const CategorySection = ({ category, products }) => {
    const Icon = CATEGORY_ICONS[category] || Box;
    if (!products?.length) return null;

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
                  product={{
                    ...product,
                    isTopNew: topNewIds.includes(product._id),
                    isTopSeller: topSellerIds.includes(product._id),
                  }}
                  onEdit={isAdmin ? handleEdit : undefined}
                  onDelete={
                    isAdmin
                      ? () => handleDelete(product._id, category)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // ============================================
  // CATEGORY NAVIGATION
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
    if (!newArrivals.length) return null;

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
              // Get category to determine API for delete
              const productCategory = Object.keys(categoryProducts).find(
                (cat) =>
                  categoryProducts[cat].some((p) => p._id === product._id)
              );

              return (
                <div key={product._id} className="relative group">
                  <ProductCard
                    product={{
                      ...product,
                      isTopNew: true,
                    }}
                    onEdit={isAdmin ? handleEdit : undefined}
                    onDelete={
                      isAdmin
                        ? () => handleDelete(product._id, productCategory)
                        : undefined
                    }
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
      <CategoryNav />
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
