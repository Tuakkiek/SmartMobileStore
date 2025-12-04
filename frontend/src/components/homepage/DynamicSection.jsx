// ============================================
// FILE: frontend/src/components/homepage/DynamicSection.jsx
// Renders different section types dynamically based on config
// ============================================

import React from "react";
import { HeroBannerCarousel } from "@/components/shared/HeroBanner";
import SecondaryBanners from "@/components/shared/SecondaryBanners";
import PromoStrip from "@/components/shared/PromoStrip";
import DealsGridSection from "@/components/shared/DealsGridSection";
import MagicDealsSection from "@/components/shared/MagicDealsSection";
import IPhoneShowcase from "@/components/shared/iPhoneShowcase";
import CategoryNav from "./CategoryNav";
import ProductsSection from "./ProductsSection";

const DynamicSection = ({
  section,
  allProducts,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  if (!section || !section.enabled) return null;

  const { type, config, title } = section;

  switch (type) {
    // ============================================
    // HERO BANNER
    // ============================================
    case "hero":
      return (
        <HeroBannerCarousel
          banners={config.images?.map((img, i) => ({
            imageSrc: img,
            alt: `Banner ${i + 1}`,
            ctaLink: config.links?.[i] || "/",
          }))}
        />
      );

    // ============================================
    // SECONDARY BANNERS
    // ============================================
    case "secondary-banners":
      return (
        <SecondaryBanners
          banners={config.images?.map((img, i) => ({
            imageSrc: img,
            link: config.links?.[i] || "/",
            alt: `Secondary Banner ${i + 1}`,
          }))}
        />
      );

    // ============================================
    // PROMO STRIP
    // ============================================
    case "promo-strip":
      return <PromoStrip />;

    // ============================================
    // CATEGORY NAVIGATION
    // ============================================
    case "category-nav":
      return <CategoryNav allProducts={allProducts} />;

    // ============================================
    // DEALS GRID
    // ============================================
    case "deals-grid":
      return (
        <DealsGridSection
          deals={config.dealImages?.map((img, i) => ({
            image: img,
            link: config.dealLinks?.[i] || "/products",
          }))}
        />
      );

    // ============================================
    // MAGIC DEALS
    // ============================================
    case "magic-deals":
      return (
        <MagicDealsSection
          config={section.config}
          allProducts={allProducts} // ← Truyền danh sách sản phẩm
        />
      );

    // ============================================
    // NEW PRODUCTS
    // ============================================
    case "products-new":
      const newProducts = [...allProducts]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, config.limit || 10);

      return (
        <ProductsSection
          title={title || "Sản phẩm mới"}
          products={newProducts}
          showBadges={true} // ← CHỈ BẬT BADGES CHO SECTION NÀY
          badgeType="new" // ← CHỈ ĐỊNH LOẠI BADGE
          // allProducts={allProducts}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          viewAllLink="/products?sort=createdAt"
        />
      );

    // ============================================
    // TOP SELLERS
    // ============================================
    case "products-topSeller":
      const topSellers = [...allProducts]
        .filter((p) => p.salesCount > 0)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, config.limit || 10);

      return (
        <ProductsSection
          title={title || "Sản phẩm bán chạy"}
          products={topSellers}
          showBadges={true} // ← CHỈ BẬT BADGES CHO SECTION NÀY
          badgeType="seller" // ← CHỈ ĐỊNH LOẠI BADGE
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          viewAllLink="/products?sort=salesCount"
        />
      );

    // ============================================
    // CATEGORY SECTION
    // ============================================
    case "category-section":
      const categoryProducts = allProducts
        .filter((p) => p.category === config.categoryFilter)
        .slice(0, config.limit || 10);

      return (
        <ProductsSection
          title={title || config.categoryFilter}
          products={categoryProducts}
          showBadges={false}
          allProducts={allProducts}
          category={config.categoryFilter}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          viewAllLink={`/products?category=${config.categoryFilter}`}
        />
      );

    // ============================================
    // IPHONE SHOWCASE
    // ============================================
    case "iphone-showcase":
      return <IPhoneShowcase items={config.showcaseItems} />;

    // ============================================
    // DEFAULT
    // ============================================
    default:
      console.warn(`Unknown section type: ${type}`);
      return null;
  }
};

export default DynamicSection;
