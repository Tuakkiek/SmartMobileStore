// frontend/src/components/product/SpecificationsTab.jsx
import React from "react";
import {
  Cpu,
  HardDrive,
  Camera,
  Monitor,
  Battery,
  Smartphone,
  Zap,
  Palette,
  Weight,
  Ruler,
  Wifi,
  Globe,
} from "lucide-react";

const SpecCard = ({ icon: Icon, label, value, gradient }) => (
  // Màu nền: Thay đổi từ các gradient đa dạng thành một gradient đỏ-đen nổi bật
  <div
    className={`relative overflow-hidden rounded-2xl p-6 ${gradient} group hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl`}
  >
    {/* Vòng tròn trắng/trong suốt ở góc */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
    <div className="relative z-10">
      {/* Icon: Trắng/Đỏ */}
      <Icon className="w-8 h-8 mb-3 text-white/90" strokeWidth={2} />
      {/* Label: Trắng/Xám nhạt */}
      <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
      {/* Value: Trắng */}
      <p className="text-white text-lg font-bold">{value}</p>
    </div>
  </div>
);

const SpecRow = ({ label, value, isHighlight = false }) => (
  <div
    className={`flex justify-between items-center px-6 py-4 transition-colors ${
      // Thay đổi màu highlight từ đỏ-cam-xám sang đỏ-trắng-đen
      isHighlight ? "bg-red-50 border-l-4 border-red-600" : "hover:bg-gray-100" // Nền highlight đỏ nhạt, border đỏ đậm, hover nền xám nhạt
    }`}
  >
    <span
      className={`${
        isHighlight ? "font-semibold text-gray-900" : "text-gray-600"
      }`}
    >
      {label}
    </span>
    <span
      className={`font-semibold ${
        isHighlight ? "text-red-700" : "text-gray-900"
      } text-right max-w-[60%]`}
    >
      {value}
    </span>
  </div>
);

export const SpecificationsTab = ({ specifications = {} }) => {
  // Định nghĩa các quick specs với icon và gradient
  // CHỈ DÙNG MÀU ĐỎ/ĐEN/TRẮNG CHO GRADIENT
  const quickSpecs = [
    {
      key: "chip",
      icon: Cpu,
      label: "Chip xử lý",
      gradient: "bg-gradient-to-br from-red-600 to-black", // Đỏ -> Đen
    },
    {
      key: "screenSize",
      icon: Monitor,
      label: "Màn hình",
      gradient: "bg-gradient-to-br from-red-700 to-red-900", // Đỏ đậm
    },
    {
      key: "rearCamera",
      icon: Camera,
      label: "Camera sau",
      gradient: "bg-gradient-to-br from-black to-red-700", // Đen -> Đỏ
    },
    {
      key: "battery",
      icon: Battery,
      label: "Pin",
      gradient: "bg-gradient-to-br from-red-500 to-red-800", // Đỏ
    },
    {
      key: "ram",
      icon: Zap,
      label: "RAM",
      gradient: "bg-gradient-to-br from-black to-gray-700", // Đen -> Xám
    },
    {
      key: "storage",
      icon: HardDrive,
      label: "Bộ nhớ",
      gradient: "bg-gradient-to-br from-red-800 to-black", // Đỏ đậm -> Đen
    },
  ];

  // Định nghĩa các section chi tiết
  const detailedSpecs = {
    // ... (Giữ nguyên cấu trúc)
    "Hiển thị": [
      { key: "screenSize", label: "Kích thước màn hình" },
      { key: "screenTech", label: "Công nghệ màn hình" },
      { key: "screenResolution", label: "Độ phân giải" },
    ],
    "Camera & Ảnh": [
      { key: "rearCamera", label: "Camera sau", highlight: true },
      { key: "frontCamera", label: "Camera trước" },
    ],
    "Hiệu năng": [
      { key: "chip", label: "Chip xử lý", highlight: true },
      { key: "gpu", label: "GPU" },
      { key: "ram", label: "RAM" },
      { key: "storage", label: "Bộ nhớ trong" },
    ],
    "Pin & Sạc": [
      { key: "battery", label: "Dung lượng pin", highlight: true },
      { key: "batteryLife", label: "Thời lượng pin" },
    ],
    "Kết nối": [
      { key: "bluetooth", label: "Bluetooth" },
      { key: "wifi", label: "WiFi" },
      { key: "connectivity", label: "Kết nối mạng" },
    ],
    "Thiết kế": [
      { key: "weight", label: "Trọng lượng" },
      { key: "dimensions", label: "Kích thước" },
      { key: "material", label: "Chất liệu" },
      { key: "waterResistance", label: "Chống nước" },
    ],
    Khác: [
      { key: "os", label: "Hệ điều hành" },
      { key: "warranty", label: "Bảo hành" },
      { key: "compatibility", label: "Tương thích" },
      { key: "calling", label: "Tính năng gọi" },
      { key: "healthFeatures", label: "Tính năng sức khỏe" },
      { key: "features", label: "Tính năng nổi bật" },
    ],
  };

  // Filter quick specs có giá trị
  const availableQuickSpecs = quickSpecs.filter(
    (spec) => specifications[spec.key]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Thanh màu bên cạnh tiêu đề: Đỏ mạnh */}
        <div className="w-1 h-8 bg-gradient-to-b from-red-600 to-red-900 rounded-full" />
        <h2 className="text-3xl font-bold text-gray-900">Thông số kỹ thuật</h2>
      </div>

      {/* Quick Specs Cards */}
      {availableQuickSpecs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableQuickSpecs.map((spec) => (
            <SpecCard
              key={spec.key}
              icon={spec.icon}
              label={spec.label}
              value={specifications[spec.key]}
              gradient={spec.gradient}
            />
          ))}
        </div>
      )}

      {/* Colors Display */}
      {specifications.colors && specifications.colors.length > 0 && (
        // Nền: Giữ màu xám nhạt (trắng/đen)
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {/* Icon: Đen/Xám */}
            <Palette className="w-6 h-6 text-gray-700" />
            <h3 className="text-xl font-bold text-gray-900">Màu sắc</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {specifications.colors.map((color, idx) => (
              <div
                key={idx}
                // Màu hover: Viền đỏ và chữ đỏ
                className="px-4 py-2 bg-white rounded-xl border-2 border-gray-200 font-medium text-gray-700 hover:border-red-600 hover:text-red-700 transition-all"
              >
                {color}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Specs Sections */}
      {Object.entries(detailedSpecs).map(([sectionTitle, specs]) => {
        // Filter specs có giá trị
        const availableSpecs = specs.filter((spec) => specifications[spec.key]);

        if (availableSpecs.length === 0) return null;

        return (
          <div
            key={sectionTitle}
            className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Section Header */}
            {/* Màu nền: Gradient Đỏ-Đen */}
            <div className="bg-gradient-to-r from-red-700 to-black px-6 py-4">
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                {/* Dấu chấm trắng nhấp nháy */}
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {sectionTitle}
              </h3>
            </div>

            {/* Section Content */}
            <div className="divide-y divide-gray-200 bg-white">
              {availableSpecs.map((spec) => (
                <SpecRow
                  key={spec.key}
                  label={spec.label}
                  value={specifications[spec.key]}
                  isHighlight={spec.highlight}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Custom Specs (for Accessories) */}
      {specifications.customSpecs && specifications.customSpecs.length > 0 && (
        <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Màu nền: Gradient Đỏ-Đen (thay cho chàm-tím) */}
          <div className="bg-gradient-to-r from-red-700 to-black px-6 py-4">
            <h3 className="font-bold text-xl text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Thông số bổ sung
            </h3>
          </div>
          <div className="divide-y divide-gray-200 bg-white">
            {specifications.customSpecs.map((spec, idx) => (
              <SpecRow key={idx} label={spec.key} value={spec.value} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {availableQuickSpecs.length === 0 &&
        Object.values(detailedSpecs).every((specs) =>
          specs.every((spec) => !specifications[spec.key])
        ) &&
        (!specifications.customSpecs ||
          specifications.customSpecs.length === 0) && (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              Chưa có thông số kỹ thuật
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Thông tin sẽ được cập nhật sớm
            </p>
          </div>
        )}
    </div>
  );
};
