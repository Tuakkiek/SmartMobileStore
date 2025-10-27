import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Smartphone, Tablet, Laptop, Watch, Headphones, Box } from "lucide-react";

import {HeroBannerCarousel} from "@/components/shared/HeroBanner";
import ProductCard from "@/components/shared/ProductCard";
import IPhoneShowcase from "@/components/shared/iPhoneShowcase";
import { Loading } from "@/components/shared/Loading";
import { productAPI, analyticsAPI } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const CATEGORY_ICONS = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Laptop,
  "Apple Watch": Watch,
  AirPods: Headphones,
  Accessories: Box,
};

const categories = Object.keys(CATEGORY_ICONS);

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [featuredProducts, setFeaturedProducts] = useState({});
  const [topSellersMap, setTopSellersMap] = useState({});
  const [newArrivals, setNewArrivals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = isAuthenticated && ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user?.role);

  // === FETCH ALL DATA IN PARALLEL ===
  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      const featured = {};
      const topSellers = {};

      try {
        // 1. Fetch featured + top sellers for each category
        await Promise.all(
          categories.map(async (cat) => {
            const [featRes, topRes] = await Promise.all([
              productAPI.getFeatured({ category: cat, limit: 4 }).catch(() => ({ data: { data: { products: [] } } })),
              analyticsAPI.getTopSellers(cat, 10).catch(() => ({ data: { data: [] } })),
            ]);

            featured[cat] = featRes.data.data.products || [];
            topSellers[cat] = topRes.data.data.map((s) => s.productId) || [];
          })
        );

        // 2. Fetch new arrivals (latest 8 products)
        const arrivalsRes = await productAPI.getNewArrivals({ limit: 8 }).catch(() => ({ data: { data: { products: [] } } }));
        setNewArrivals(arrivalsRes.data.data.products || []);

        setFeaturedProducts(featured);
        setTopSellersMap(topSellers);
      } catch (err) {
        console.error("Lỗi tải dữ liệu trang chủ:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleEdit = (product) => {
    navigate(`/warehouse/products?edit=${product._id}`, { state: { product } });
  };

  const handleViewAll = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  // === RENDER CATEGORY SECTION ===
  const CategorySection = ({ category, products }) => {
    const Icon = CATEGORY_ICONS[category] || Box;
    if (!products?.length) return null;

    // Top 10 newest in this category
    const newestIds = [...products]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((p) => p._id);

    const topSellerIds = topSellersMap[category] || [];

    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold text-gray-900">{category}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleViewAll(category)}>
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isTopNew={newestIds.includes(product._id)}
                isTopSeller={topSellerIds.includes(product._id)}
                onEdit={canEdit ? () => handleEdit(product) : undefined}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  // === NEW ARRIVALS SECTION ===
  const NewArrivalsSection = () => {
    if (!newArrivals.length) return null;

    return (
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sản phẩm mới</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/products?sort=createdAt")}>
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isTopNew={true}
                onEdit={canEdit ? () => handleEdit(product) : undefined}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  // === CATEGORY NAVIGATION BAR ===
  const CategoryNav = () => (
    <section className="py-10 bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Box;
            return (
              <button
                key={cat}
                onClick={() => handleViewAll(cat)}
                className="group flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
              >
                <Icon className="w-9 h-9 text-primary group-hover:text-white transition-colors" />
                <span className="text-sm font-medium group-hover:text-white">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <HeroBannerCarousel />

      {/* Category Navigation */}
      <CategoryNav />

      {/* iPhone Showcase (chỉ hiện nếu có iPhone) */}
      {featuredProducts.iPhone?.length > 0 && <IPhoneShowcase />}

      {/* New Arrivals */}
      <NewArrivalsSection />

      {/* Category Sections */}
      {categories.map((cat) => (
        <CategorySection key={cat} category={cat} products={featuredProducts[cat] || []} />
      ))}
    </div>
  );
};

export default HomePage;