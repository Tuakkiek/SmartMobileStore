// ============================================
// FILE: src/components/shared/PromoStrip.jsx
// ============================================
import React from "react";
import { Gift, Tag, CreditCard, Zap } from "lucide-react";

const PromoStrip = () => {
  const promos = [
    {
      icon: Gift,
      text: "Săn Deal Online",
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      icon: Tag,
      text: "Iphone mua 1 tặng 1",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      icon: CreditCard,
      text: "Voucher tặng bạn mới",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      icon: Zap,
      text: "Sim du lịch",
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
    },
  ];

  return (
    <div className="bg-white border-b border-gray-100 py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {promos.map((promo, index) => {
            const Icon = promo.icon;
            return (
              <button
                key={index}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${promo.bgColor} hover:shadow-md transition-all duration-300 whitespace-nowrap flex-shrink-0`}
              >
                <Icon className={`w-4 h-4 ${promo.iconColor}`} />
                <span className="text-sm font-medium text-gray-700">
                  {promo.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PromoStrip;