import React, { useState } from "react";
import {
  Cpu,
  HardDrive,
  Camera,
  Monitor,
  Battery,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const SpecCard = ({ icon: Icon, label, value }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:border-red-500 hover:shadow-lg transition-all group">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
        <Icon className="w-5 h-5 text-red-600" />
      </div>
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
    <p className="text-base font-bold text-gray-900 ml-13">{value}</p>
  </div>
);

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>
      {isOpen && <div className="border-t-2 border-gray-100">{children}</div>}
    </div>
  );
};

const SpecRow = ({ label, value, highlight = false }) => (
  <div
    className={`flex justify-between items-center px-6 py-4 border-b last:border-b-0 ${
      highlight
        ? "bg-red-50 border-l-4 border-l-red-600"
        : "hover:bg-gray-50 transition-colors"
    }`}
  >
    <span className={`${highlight ? "font-semibold" : ""} text-gray-700`}>
      {label}
    </span>
    <span
      className={`font-semibold text-right max-w-[60%] ${
        highlight ? "text-red-700" : "text-gray-900"
      }`}
    >
      {value}
    </span>
  </div>
);

export const SpecificationsTab = ({ specifications = {} }) => {
  // Quick highlight specs
  const highlightSpecs = [
    { key: "chip", icon: Cpu, label: "Chip xử lý" },
    { key: "screenSize", icon: Monitor, label: "Màn hình" },
    { key: "rearCamera", icon: Camera, label: "Camera" },
    { key: "battery", icon: Battery, label: "Pin" },
    { key: "ram", icon: HardDrive, label: "RAM" },
    { key: "storage", icon: HardDrive, label: "Bộ nhớ" },
  ].filter((spec) => specifications[spec.key]);

  // Detailed sections
  const sections = [
    {
      title: "Màn hình & Hiển thị",
      specs: [
        { key: "screenSize", label: "Kích thước màn hình", highlight: true },
        { key: "screenTech", label: "Công nghệ màn hình" },
        { key: "screenResolution", label: "Độ phân giải" },
      ],
    },
    {
      title: "Camera & Quay phim",
      specs: [
        { key: "rearCamera", label: "Camera sau", highlight: true },
        { key: "frontCamera", label: "Camera trước" },
      ],
    },
    {
      title: "Hiệu năng & Bộ nhớ",
      specs: [
        { key: "chip", label: "Chip xử lý", highlight: true },
        { key: "gpu", label: "Card đồ họa" },
        { key: "ram", label: "RAM", highlight: true },
        { key: "storage", label: "Bộ nhớ trong" },
      ],
    },
    {
      title: "Pin & Sạc",
      specs: [
        { key: "battery", label: "Dung lượng pin", highlight: true },
        { key: "batteryLife", label: "Thời lượng pin" },
      ],
    },
    {
      title: "Thông tin khác",
      specs: [
        { key: "os", label: "Hệ điều hành" },
        { key: "bluetooth", label: "Bluetooth" },
        { key: "waterResistance", label: "Kháng nước" },
        { key: "compatibility", label: "Tương thích" },
        { key: "calling", label: "Gọi điện" },
        { key: "healthFeatures", label: "Tính năng sức khỏe" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-10 bg-red-600 rounded-full" />
        <h2 className="text-2xl font-bold text-gray-900">Thông số kỹ thuật</h2>
      </div>

      {/* Quick Specs Grid */}
      {highlightSpecs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlightSpecs.map((spec) => (
            <SpecCard
              key={spec.key}
              icon={spec.icon}
              label={spec.label}
              value={specifications[spec.key]}
            />
          ))}
        </div>
      )}

      {/* Color Swatches */}
      {specifications.colors && specifications.colors.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Màu sắc có sẵn</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {specifications.colors.map((color, idx) => (
              <div
                key={idx}
                className="px-5 py-2.5 bg-white border-2 border-red-300 rounded-lg font-semibold text-gray-800 hover:bg-red-50 hover:border-red-500 transition-all shadow-sm"
              >
                {color}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const availableSpecs = section.specs.filter(
            (s) => specifications[s.key]
          );
          if (availableSpecs.length === 0) return null;

          return (
            <CollapsibleSection key={section.title} title={section.title}>
              {availableSpecs.map((spec) => (
                <SpecRow
                  key={spec.key}
                  label={spec.label}
                  value={specifications[spec.key]}
                  highlight={spec.highlight}
                />
              ))}
            </CollapsibleSection>
          );
        })}
      </div>

      {/* Empty State */}
      {highlightSpecs.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-gray-200">
          <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
