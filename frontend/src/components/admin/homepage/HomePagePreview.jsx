// ============================================
// FILE: frontend/src/components/admin/homepage/HomePagePreview.jsx
// Live preview of homepage with dynamic sections
// ============================================

import React from "react";
import { cn } from "@/lib/utils";

const HomePagePreview = ({ sections, mode = "desktop" }) => {
  const enabledSections = sections
    ?.filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const renderSection = (section) => {
    switch (section.type) {
      case "hero":
        return (
          <div className="aspect-[24/9] bg-gray-200 rounded-lg overflow-hidden relative">
            {section.config.images?.[0] ? (
              <img
                src={section.config.images[0]}
                alt="Hero"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Hero Banner
              </div>
            )}
          </div>
        );

      case "secondary-banners":
        return (
          <div className="grid grid-cols-2 gap-2">
            {(section.config.images || []).slice(0, 2).map((img, i) => (
              <div
                key={i}
                className="aspect-[21/9] bg-gray-200 rounded-lg overflow-hidden"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        );

      case "promo-strip":
        return (
          <div className="bg-red-600 text-white text-center py-2 text-xs font-medium">
            🔥 Khuyến mãi đặc biệt • Miễn phí giao hàng
          </div>
        );

      case "category-nav":
        return (
          <div className="grid grid-cols-3 gap-2">
            {["iPhone", "iPad", "Mac"].map((cat, i) => (
              <div
                key={i}
                className="bg-gray-100 rounded-lg p-3 text-center text-xs font-medium"
              >
                {cat}
              </div>
            ))}
          </div>
        );

      case "deals-grid":
      case "magic-deals":
        return (
          <div className="grid grid-cols-2 gap-2">
            {(section.config.dealImages || []).slice(0, 4).map((img, i) => (
              <div
                key={i}
                className="aspect-video bg-gray-200 rounded-lg overflow-hidden"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        );

      case "products-new":
      case "products-topSeller":
      case "category-section":
        return (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {section.title || section.type}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white border rounded-lg p-2 space-y-1"
                >
                  <div className="aspect-square bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        );

      case "iphone-showcase":
        return (
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 aspect-[3/4] bg-gray-200 rounded-lg"
              />
            ))}
          </div>
        );

      default:
        return (
          <div className="bg-gray-100 rounded-lg p-4 text-center text-xs text-gray-500">
            {section.type}
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "bg-white shadow-lg overflow-auto",
        mode === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
      )}
    >
      <div className="space-y-4 p-4">
        {enabledSections?.map((section) => (
          <div key={section.id} className="space-y-2">
            {renderSection(section)}
          </div>
        ))}

        {!enabledSections?.length && (
          <div className="text-center py-12 text-gray-400">
            No enabled sections
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePagePreview;