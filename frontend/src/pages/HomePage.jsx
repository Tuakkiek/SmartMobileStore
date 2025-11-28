// ============================================
// FILE: src/pages/HomePage.jsx
// CẬP NHẬT: Logic badge bán chạy dựa trên salesCount
// ============================================

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
import SecondaryBanners from "@/components/shared/SecondaryBanners";
import PromoStrip from "@/components/shared/PromoStrip";
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
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import ProductEditModal from "@/components/shared/ProductEditModal";
import DealsGridSection from "@/components/shared/DealsGridSection";
import MagicDealsSection from "@/components/shared/MagicDealsSection";

// ============================================
// CATEGORY CONFIG
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
// HERO SECTION WITH BANNERS
// ============================================
const HeroSection = ({ currentSlide, onSlideChange }) => {
  return (
    <div className="bg-gradient-to-b from-red-50 to-white">
      <HeroBannerCarousel onSlideChange={onSlideChange} />
      <SecondaryBanners slideIndex={currentSlide} />
    </div>
  );
};

// ============================================
// CATEGORY NAVIGATION
// ============================================
const CategoryNav = ({ onCategoryClick, productCounts }) => {
  return (
    <section className="bg-white border-b border-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Box;
            const count = productCounts[cat] || 0;

            return (
              <button
                key={cat}
                onClick={() => onCategoryClick(cat)}
                className="group flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-primary hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white group-hover:bg-white/90 transition-colors">
                  <Icon className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
                </div>
                <div className="text-center">
                  <span className="text-xs md:text-sm font-medium text-gray-900 group-hover:text-white block">
                    {cat}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] md:text-xs text-gray-500 group-hover:text-white/80">
                      {count}+
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
};

// ============================================
// NEW ARRIVALS SECTION - CẬP NHẬT
// ============================================
const NewArrivalsSection = ({
  products,
  isAdmin,
  onEdit,
  onDelete,
  onViewAll,
  topSellersMap, // ← THÊM PROP
}) => {
  if (!Array.isArray(products) || products.length === 0) return null;
  // ✅ Tạo Set chứa TẤT CẢ top seller IDs từ mọi category
  const allTopSellerIds = new Set(
    Object.values(topSellersMap)
      .flat()
      .map((id) => id.toString())
  );
  // ✅ Top 10 sản phẩm mới nhất
  const topNewIds = [...products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((p) => p._id.toString());
  return (
    <section className="py-10 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Sản phẩm mới
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="hover:bg-primary hover:text-white transition-colors"
          >
            Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {products.map((product) => (
            <div key={product._id} className="relative group">
              <ProductCard
                product={product}
                isTopNew={topNewIds.includes(product._id.toString())} // ← Top 10 mới
                isTopSeller={allTopSellerIds.has(product._id.toString())} // ← Top 10 bán chạy
                onEdit={isAdmin ? () => onEdit(product) : undefined}
                onDelete={
                  isAdmin
                    ? () => onDelete(product._id, product.category)
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
// TOP SELLERS SECTION - MỚI THÊM
// ============================================
const TopSellersSection = ({
  products,
  isAdmin,
  onEdit,
  onDelete,
  onViewAll,
  topNewIdsOverall, // ← Top new IDs toàn bộ để check badge
}) => {
  if (!Array.isArray(products) || products.length === 0) return null;
  // ✅ Top 10 sản phẩm mới nhất toàn bộ (để check isTopNew)
  const topNewIds = topNewIdsOverall.map((id) => id.toString());
  return (
    <section className="py-10 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Sản phẩm bán chạy
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="hover:bg-primary hover:text-white transition-colors"
          >
            Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {products.map((product) => (
            <div key={product._id} className="relative group">
              <ProductCard
                product={product}
                isTopNew={topNewIds.includes(product._id.toString())} // ← Check top new toàn bộ
                isTopSeller={true} // ← Tất cả ở đây đều là top seller
                onEdit={isAdmin ? () => onEdit(product) : undefined}
                onDelete={
                  isAdmin
                    ? () => onDelete(product._id, product.category)
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
// CATEGORY SECTION - CẬP NHẬT
// ============================================
const CategorySection = ({
  category,
  products,
  topNewIds,
  topSellerIds,
  isAdmin,
  onEdit,
  onDelete,
  onViewAll,
}) => {
  const Icon = CATEGORY_ICONS[category] || Box;
  if (!Array.isArray(products) || products.length === 0) return null;
  return (
    <section className="py-10 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {category}
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewAll(category)}
            className="hover:bg-primary hover:text-white transition-colors"
          >
            Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {products.map((product) => (
            <div key={product._id} className="relative group">
              <ProductCard
                product={product}
                isTopNew={topNewIds?.includes(product._id.toString())} // ← Top 10 mới
                isTopSeller={topSellerIds?.includes(product._id.toString())} // ← Top 10 bán chạy
                onEdit={isAdmin ? () => onEdit(product) : undefined}
                onDelete={
                  isAdmin ? () => onDelete(product._id, category) : undefined
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
// MAIN COMPONENT
// ============================================
const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [topSellersMap, setTopSellersMap] = useState({});
  const [newArrivals, setNewArrivals] = useState([]);
  const [topSellers, setTopSellers] = useState([]); // ← THÊM STATE CHO TOP SELLERS
  const [isLoading, setIsLoading] = useState(true);

  // EDIT MODAL
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const isAdmin =
    isAuthenticated &&
    ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user?.role);

  // ============================================
  // FETCH DATA - CẬP NHẬT
  // ============================================
  const fetchHomeData = useCallback(async () => {
    setIsLoading(true);
    const allProducts = {};
    const topSellers = {}; // ← Thay đổi: Lưu toàn bộ product IDs có salesCount cao
    try {
      await Promise.all(
        categories.map(async (cat) => {
          const api = API_MAP[cat];
          if (!api?.getAll) return;
          try {
            const productsRes = await api.getAll({ limit: 100 }); // ← Tăng limit để lấy đủ data
            const products =
              productsRes.data?.data?.products || productsRes.data || [];
            const productsWithCategory = products.map((p) => ({
              ...p,
              category: cat,
            }));
            // ✅ SẮP XẾP THEO salesCount, LẤY TOP 10
            const topSellingProducts = [...productsWithCategory]
              .filter((p) => p.salesCount > 0) // Chỉ lấy sản phẩm có sales
              .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
              .slice(0, 1);
            const topSellerIds = topSellingProducts.map((p) => p._id);
            allProducts[cat] = productsWithCategory.slice(0, 10); // Hiển thị 8 sản phẩm
            topSellers[cat] = topSellerIds; // ← Lưu IDs của top 10 bán chạy
          } catch (error) {
            console.error(`Error fetching ${cat}:`, error);
            allProducts[cat] = [];
            topSellers[cat] = [];
          }
        })
      );
      const allProductsList = Object.values(allProducts).flat();

      // ✅ TOP SẢN PHẨM MỚI (theo createdAt)
      const sortedNewArrivals = [...allProductsList]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10); // ← Top 10 mới nhất
      setNewArrivals(sortedNewArrivals.slice(0, 10)); // Hiển thị 10

      // ✅ TOP SẢN PHẨM BÁN CHẠY TOÀN BỘ (MỚI THÊM)
      const sortedTopSellers = [...allProductsList]
        .filter((p) => p.salesCount > 0)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 10); // ← Top 10 bán chạy nhất cross-category
      setTopSellers(sortedTopSellers); // Hiển thị 10

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
  // HANDLERS
  // ============================================
  const getTopNewIds = (products) => {
    if (!Array.isArray(products) || products.length === 0) return [];
    return [...products]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10) // ← Top 10 mới nhất
      .map((p) => p._id)
      .filter(Boolean);
  };

  // THÊM: Get top new IDs toàn bộ cho TopSellersSection
  const getTopNewIdsOverall = () => {
    const allProductsList = Object.values(categoryProducts).flat();
    return [...allProductsList]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((p) => p._id)
      .filter(Boolean);
  };

  const handleDelete = async (productId, category) => {
    const api = API_MAP[category];
    if (!api?.delete) {
      toast.error("Không hỗ trợ xóa sản phẩm này");
      return;
    }

    try {
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      fetchHomeData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleViewAll = (category) => {
    if (category) {
      navigate(`/products?category=${encodeURIComponent(category)}`);
    } else {
      navigate("/products?sort=createdAt");
    }
  };

  // THÊM: View all cho top sellers (sort by salesCount)
  const handleViewAllTopSellers = () => {
    navigate("/products?sort=salesCount");
  };

  const productCounts = Object.keys(categoryProducts).reduce((acc, cat) => {
    acc[cat] = categoryProducts[cat]?.length || 0;
    return acc;
  }, {});

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection
        currentSlide={currentSlide}
        onSlideChange={setCurrentSlide}
      />
      <PromoStrip />
      <CategoryNav
        onCategoryClick={handleViewAll}
        productCounts={productCounts}
      />
      <DealsGridSection />
      <MagicDealsSection />
      {/* ✅ TRUYỀN topSellersMap VÀO NewArrivalsSection */}
      <NewArrivalsSection
        products={newArrivals}
        topSellersMap={topSellersMap} // ← THÊM PROP
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAll={() => handleViewAll()}
      />
      {/* ✅ TOP SELLERS SECTION - MỚI THÊM, BÊN DƯỚI NEW ARRIVALS */}
      <TopSellersSection
        products={topSellers}
        topNewIdsOverall={getTopNewIdsOverall()} // ← Truyền top new IDs toàn bộ
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAll={handleViewAllTopSellers}
      />
      {/* Category Sections */}
      {categories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          products={categoryProducts[cat] || []}
          topNewIds={getTopNewIds(categoryProducts[cat] || [])}
          topSellerIds={topSellersMap[cat] || []} // ← Đã có sẵn
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewAll={handleViewAll}
        />
      ))}
      {categoryProducts.iPhone?.length > 0 && <IPhoneShowcase />}
      <ProductEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mode="edit"
        product={editingProduct}
        onSave={fetchHomeData}
      />
    </div>
  );
};

export default HomePage;
