// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProductCard  from "../components/shared/ProductCard";
import { Loading } from "@/components/shared/Loading";
import {
  ArrowRight,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Box,
} from "lucide-react";
import { productAPI } from "@/lib/api";
import IPhoneShowcase from "@/components/shared/iPhoneShowcase";
import { HeroBannerCarousel } from "@/components/shared/HeroBanner";

const CATEGORY_ICONS = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Laptop,
  "Apple Watch": Watch,
  AirPods: Headphones,
  "Phụ kiện": Box,
};

const CategorySection = ({ category, products, onViewAll }) => {
  const Icon = CATEGORY_ICONS[category] || Box;

  if (!products || products.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">{category}</h2>
          </div>
          <Button variant="ghost" onClick={() => onViewAll(category)}>
            Xem tất cả
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [categoryProducts, setCategoryProducts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const categories = Object.keys(CATEGORY_ICONS);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsData = {};
        await Promise.all(
          categories.map(async (category) => {
            try {
              const response = await productAPI.getFeatured({
                category,
                limit: 4,
              });
              productsData[category] = response.data.data.products;
            } catch (error) {
              console.error(`Error fetching ${category}:`, error);
              productsData[category] = [];
            }
          })
        );

        setCategoryProducts(productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewAll = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      {/* Hero Banner */}
      <HeroBannerCarousel />

      {/* Category Navigation */}
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category] || Box;
              return (
                <button
                  key={category}
                  onClick={() => handleViewAll(category)}
                  className="flex flex-col items-center gap-3 p-6 bg-white rounded-lg hover:shadow-lg transition-all hover:scale-105"
                >
                  <Icon className="w-8 h-8 text-primary" />
                  <span className="font-medium text-sm">{category}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Sản phẩm mới</h2>
            <Button
              variant="ghost"
              onClick={() => navigate("/products?sort=createdAt")}
            >
              Xem tất cả
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <NewArrivalsSection />
        </div>
      </section>

      {/* Category Sections */}
      {categories.map((category) => (
        <CategorySection
          key={category}
          category={category}
          products={categoryProducts[category]}
          onViewAll={handleViewAll}
        />
      ))}

      {/* iPhone Showcase */}
      {categoryProducts.iPhone && categoryProducts.iPhone.length > 0 && (
        <IPhoneShowcase />
      )}
    </div>
  );
};

// New Arrivals Component
const NewArrivalsSection = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const response = await productAPI.getNewArrivals({ limit: 8 });
        setProducts(response.data.data.products);
      } catch (error) {
        console.error("Error fetching new arrivals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewArrivals();
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default HomePage;