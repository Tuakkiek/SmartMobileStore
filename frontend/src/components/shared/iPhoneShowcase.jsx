// ============================================
// FILE: src/components/shared/iPhoneShowcase.jsx
// ============================================
import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const iPhoneShowcase = () => {
  const scrollContainerRef = useRef(null);

  const showcaseItems = [
    {
      id: 1,
      title: "Thiết kế Đột Phá",
      subtitle: "Một diện mạo hoàn toàn mới.",
      image: "/img1.png",
      alt: "iPhone Camera Design",
    },
    {
      id: 2,
      title: "Camera Chuyên Nghiệp",
      subtitle: "Hệ thống camera Pro đột phá.",
      image: "/img2.png",
      alt: "iPhone Camera Features",
    },
    {
      id: 3,
      title: "Hiệu Năng Vượt Trội",
      subtitle: "A19 Pro Chip",
      image: "/img3.png",
      alt: "iPhone A19 Pro Chip",
    },
    {
      id: 4,
      title: " Apple Intelligence ",
      subtitle: "Apple Intelligence sắp có phiên bản tiếng Việt.",
      image: "/img4.png",
      alt: "iOS Apple Intelligence",
    },
    {
      id: 5,
      title: " Bảo Vệ Môi Trường",
      subtitle: "Được thiết kế vì hành tinh của chúng ta.",
      image: "/img5.png",
      alt: "iPhone Environment",
    },
  ];

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-900">
            Tìm hiểu iPhone.
          </h2>
        </div>

        {/* Showcase Cards Container */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-300 hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-300 hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {showcaseItems.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-[320px] md:w-[360px] bg-black rounded-3xl overflow-hidden relative group cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                {/* Content */}
                <div className="p-8 pb-6 relative z-10">
                  <p className="text-gray-400 text-sm font-medium mb-2">
                    {item.title}
                  </p>
                  <h3 className="text-white text-2xl font-semibold mb-1">
                    {item.subtitle}
                  </h3>
                  {item.subtitle2 && (
                    <h3 className="text-white text-2xl font-semibold mb-1">
                      {item.subtitle2}
                    </h3>
                  )}
                  {item.subtitle3 && (
                    <h3 className="text-white text-2xl font-semibold mb-3">
                      {item.subtitle3}
                    </h3>
                  )}
                  {item.description && (
                    <p className="text-gray-400 text-sm mt-4">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Image */}
                <div className="relative h-[400px] flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Plus Button */}
                <button
                  className="absolute bottom-6 right-6 bg-white rounded-full p-2 hover:bg-gray-100 transition-all duration-300 shadow-lg z-20"
                  aria-label={`Learn more about ${item.title}`}
                >
                  <Plus className="w-5 h-5 text-gray-800" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hide scrollbar CSS */}
      <style>{`
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`}</style>
    </section>
  );
};

export default iPhoneShowcase;
