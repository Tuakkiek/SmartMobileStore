// ============================================
// FILE: src/components/shared/DealsGridSection.jsx
// Bố cục 3 cột × 3 hàng, chỉ giữ ảnh, nền gradient đen → xanh đậm
// ============================================
import React from "react";
import { Link } from "react-router-dom";

// ============================================
// DỮ LIỆU DEAL
// ============================================
const dealsData = [
  { link: "/products?category=iPhone", image: "/banner_phu2.png" },
  { link: "/products?category=iPhone", image: "/banner_phu4.png" },
  { link: "/products?category=iPhone", image: "/banner_phu1.png" },
  { link: "/products?category=iPhone", image: "/banner_phu5.png" },
  { link: "/products?category=iPhone", image: "/banner_phu5.png" },
  { link: "/products?category=iPhone", image: "/banner_phu5.png" },
  { link: "/products?category=iPhone", image: "/banner_phu3.png" },
  { link: "/products?category=iPhone", image: "/banner_phu7.png" },
  { link: "/products?category=iPhone", image: "/banner_phu7.png" },
];

// ============================================
// DEAL CARD COMPONENT — chỉ hiển thị ảnh
// ============================================
const DealCard = ({ deal, className = "" }) => {
  return (
    <Link
      to={deal.link}
      className={`block overflow-hidden rounded-xl shadow-lg transition-transform duration-300 hover:scale-[1.02] ${className}`}
    >
      <img src={deal.image} alt="deal" className="w-full h-full object-cover" />
    </Link>
  );
};

// ============================================
// DEALS GRID SECTION
// ============================================
const DealsGridSection = ({ deals }) => {
  // ✅ FIX 1: Uncomment defaultDeals
  const defaultDeals = [
    { link: "/products?category=iPhone", image: "/banner_phu2.png" },
    { link: "/products?category=iPhone", image: "/banner_phu4.png" },
    { link: "/products?category=iPhone", image: "/banner_phu1.png" },
    { link: "/products?category=iPhone", image: "/banner_phu5.png" },
    { link: "/products?category=iPhone", image: "/banner_phu5.png" },
    { link: "/products?category=iPhone", image: "/banner_phu5.png" },
    { link: "/products?category=iPhone", image: "/banner_phu3.png" },
    { link: "/products?category=iPhone", image: "/banner_phu7.png" },
    { link: "/products?category=iPhone", image: "/banner_phu7.png" },
  ];

  const dealsData = deals && deals.length > 0 ? deals : defaultDeals;

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-black to-white/90">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-5xl font-black text-center text-white mb-10 md:mb-14">
          Lạc vào mê cung ưu đãi, ngã nào cũng lời!
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 md:auto-rows-[200px]">
          {/* Cột trái: Deal 0 (row-span-2) */}
          <div className="md:row-span-2">
            {dealsData[0]?.link && (
              <DealCard deal={dealsData[0]} className="h-full" />
            )}
          </div>

          {/* Cột giữa: Deal 1 (row-span-3) */}
          <div className="md:row-span-3">
            {dealsData[1]?.link && (
              <DealCard deal={dealsData[1]} className="h-full" />
            )}
          </div>

          {/* Cột phải: Deals 2, 3, 4, 5 */}
          {/* Row 1, Col 3 */}
          {dealsData[2]?.link && (
            <DealCard deal={dealsData[2]} />
          )}

          {/* Row 2, Col 3 */}
          {dealsData[3]?.link && (
            <DealCard deal={dealsData[3]} />
          )}

          {/* Row 3, Col 3 */}
          {dealsData[4]?.link && (
            <DealCard deal={dealsData[4]} />
          )}

          {/* Row 4, Col 3 - Nếu muốn 4 deals ở cột phải */}
          {dealsData[5]?.link && (
            <DealCard deal={dealsData[5]} />
          )}
        </div>
      </div>
    </section>
  );
};

export default DealsGridSection;
