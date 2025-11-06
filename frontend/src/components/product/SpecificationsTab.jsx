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
} from "lucide-react";

const SpecCard = ({ icon: Icon, label, value }) => (
  <div className="relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all group hover:border-red-500">
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-6 h-6 text-red-600" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
        {value}
      </p>
    </div>
  </div>
);

const SpecRow = ({ label, value, isHighlight }) => (
  <div
    className={`flex justify-between items-center px-6 py-4 border-b last:border-b-0 ${
      isHighlight
        ? "bg-red-50 border-l-4 border-red-600"
        : "hover:bg-gray-50 transition-colors"
    }`}
  >
    <span
      className={`${
        isHighlight ? "text-gray-900 font-medium" : "text-gray-600"
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
  const quickSpecs = [
    { key: "chip", icon: Cpu, label: "Chip xử lý" },
    { key: "screenSize", icon: Monitor, label: "Màn hình" },
    { key: "rearCamera", icon: Camera, label: "Camera sau" },
    { key: "battery", icon: Battery, label: "Pin" },
    { key: "ram", icon: Zap, label: "RAM" },
    { key: "storage", icon: HardDrive, label: "Bộ nhớ" },
  ];

  const detailedSpecs = {
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
  };

  const availableQuickSpecs = quickSpecs.filter(
    (spec) => specifications[spec.key]
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-red-600 rounded-full" />
        <h2 className="text-3xl font-bold text-gray-900">
          Thông số kỹ thuật
        </h2>
      </div>

      {/* Quick Specs */}
      {availableQuickSpecs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableQuickSpecs.map((spec) => (
            <SpecCard
              key={spec.key}
              icon={spec.icon}
              label={spec.label}
              value={specifications[spec.key]}
            />
          ))}
        </div>
      )}

      {/* Colors */}
      {specifications.colors && specifications.colors.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-bold text-gray-900">Màu sắc</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {specifications.colors.map((color, idx) => (
              <div
                key={idx}
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:border-red-600 hover:text-red-700 transition-all"
              >
                {color}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail sections */}
      {Object.entries(detailedSpecs).map(([sectionTitle, specs]) => {
        const availableSpecs = specs.filter((s) => specifications[s.key]);
        if (availableSpecs.length === 0) return null;
        return (
          <div
            key={sectionTitle}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-white">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <h3 className="font-bold text-xl text-gray-900">
                {sectionTitle}
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
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

      {/* Empty State */}
      {availableQuickSpecs.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
          <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
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
