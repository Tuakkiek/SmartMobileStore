import React from "react";
import { Plus } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const iPhoneShowcase = () => {
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
      title: "Apple Intelligence",
      subtitle: "Apple Intelligence sắp có phiên bản tiếng Việt.",
      image: "/img4.png",
      alt: "iOS Apple Intelligence",
    },
    {
      id: 5,
      title: "Bảo Vệ Môi Trường",
      subtitle: "Được thiết kế vì hành tinh của chúng ta.",
      image: "/img5.png",
      alt: "iPhone Environment",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-900">
            Tìm hiểu iPhone.
          </h2>
        </div>

        {/* Carousel */}
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {showcaseItems.map((item) => (
              <CarouselItem
                key={item.id}
                className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <div className="bg-black rounded-3xl overflow-hidden relative group cursor-pointer hover:scale-105 transition-transform duration-300 h-[600px]">
                  {/* Background Image - Full card */}
                  <div className="absolute inset-0">
                    <img
                      src={item.image}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/30"></div>

                  {/* Content - Positioned absolutely over the image */}
                  <div className="absolute top-0 left-0 right-0 p-8 z-10">
                    <p className="text-gray-300 text-sm font-medium mb-2">
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
                      <p className="text-gray-300 text-sm mt-4">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Plus Button */}
                  <button
                    className="absolute bottom-6 right-6 bg-white rounded-full p-2 hover:bg-gray-100 transition-all duration-300 shadow-lg z-20"
                    aria-label={`Learn more about ${item.title}`}
                  >
                    <Plus className="w-5 h-5 text-gray-800" />
                  </button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-300 hover:scale-110" />
          <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-300 hover:scale-110" />
        </Carousel>
      </div>
    </section>
  );
};

export default iPhoneShowcase;
