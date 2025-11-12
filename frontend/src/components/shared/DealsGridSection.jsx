// ============================================
// FILE: src/components/shared/DealsGridSection.jsx
// Bố cục 3 cột × 3 hàng, gộp deal theo yêu cầu
// ============================================
import React from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Tag,
  Clock,
  Monitor,
  Smartphone,
  Heart,
  ChevronRight,
} from "lucide-react";

// ============================================
// DỮ LIỆU DEAL
// ============================================
const dealsData = [
  {
    action: "Rinh ngay",
    link: "/products?category=iPhone",
    icon: Smartphone,
  },
  {
    action: "Rinh ngay",
    link: "/products?category=iPhone",
    icon: Heart,
  },
  {
    action: "Mua ngay",
    link: "/products?category=iPhone",
    icon: Monitor,
  },
  {
    action: "Sắm ngay",
    link: "/products?category=iPhone",
    icon: Zap,
  },
  {
    action: "Mua ngay",
    link: "/products?category=iPhone",
    icon: Clock,
  },
  {
    action: "Mua ngay",
    link: "/products?category=iPhone",
    icon: Tag,
  },
  {
    action: "Mua ngay",
    link: "/products?category=iPhone",
    icon: Tag,
  },
  {
    action: "Chiến ngay",
    link: "/products?category=iPhone",
    icon: Zap,
  },
  {
    action: "Mua ngay",
    link: "/products?category=iPhone",
    icon: Heart,
  },
];

// ============================================
// DEAL CARD COMPONENT
// ============================================
const DealCard = ({ deal, className = "" }) => {
  const Icon = deal.icon;
  return (
    <Link
      to={deal.link}
      className={`group relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl bg-white text-gray-900 flex flex-col justify-end p-5 ${className}`}
    >
      <div className="absolute top-3 right-3 opacity-70">
        <Icon className="w-6 h-6 md:w-8 md:h-8" />
      </div>

      <div className="relative z-10">
        <h3 className="text-sm md:text-base font-semibold text-gray-600">
          {deal.title}
        </h3>
        <p className="text-xl md:text-2xl font-bold leading-tight mb-2">
          {deal.subtitle}
        </p>
        <div className="inline-flex items-center gap-1.5 font-bold px-4 py-2 rounded-full text-sm bg-red-600 text-white group-hover:bg-yellow-400 group-hover:text-black transition-all duration-300">
          {deal.action}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

// ============================================
// DEALS GRID SECTION
// ============================================
const DealsGridSection = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-5xl font-black text-center text-white mb-10 md:mb-14">
          Lạc vào mê cung ưu đãi, ngã nào cũng lời!
        </h2>

        <div
          className="
            grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6
            md:auto-rows-[200px]
          "
        >
          {/* Cột trái: Deal 1 + 4 gộp thành 1 ô lớn */}
          <div className="md:row-span-2">
            <DealCard
              deal={{
                action: "Khám phá",
                link: "/products?category=iPhone",
                icon: Smartphone,
              }}
              className="h-full bg-gradient-to-br from-red-900 via-red-700 to-black text-white"
            />
          </div>

          {/* Cột giữa: Deal 2 + 5 + 8 gộp thành 1 ô lớn */}
          <div className="md:row-span-3">
            <DealCard
              deal={{
                action: "Săn ngay",
                link: "/products?category=iPhone",
                icon: Zap,
              }}
              className="h-full bg-gradient-to-br from-yellow-600 via-orange-500 to-red-600 text-white"
            />
          </div>

          {/* Cột phải: Các deal lẻ (3, 6, 7, 9) */}
          <DealCard deal={dealsData[2]} />
          <DealCard deal={dealsData[5]} />
          <DealCard deal={dealsData[6]} />
          <DealCard deal={dealsData[8]} />
        </div>
      </div>
    </section>
  );
};

export default DealsGridSection;
