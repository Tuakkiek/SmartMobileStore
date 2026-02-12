// ============================================
// FILE: frontend/src/components/warehouse/WarehouseStructurePreview.jsx
// Component hiển thị preview cấu trúc kho 3D
// ============================================

import React from "react";
import { Package, Layers, Grid, Box } from "lucide-react";

const WarehouseStructurePreview = ({ warehouse }) => {
  if (!warehouse || !warehouse.zones || warehouse.zones.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">Chưa có cấu hình kho</p>
      </div>
    );
  }

  const totalLocations = warehouse.zones.reduce(
    (sum, zone) =>
      sum + zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf,
    0
  );

  const totalCapacity = warehouse.zones.reduce(
    (sum, zone) =>
      sum +
      zone.aisles *
        zone.shelvesPerAisle *
        zone.binsPerShelf *
        (zone.capacityPerBin || 100),
    0
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Layers className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Số Khu</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {warehouse.zones.length}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Grid className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Tổng Vị Trí</span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {totalLocations.toLocaleString()}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Box className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Sức Chứa</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {totalCapacity.toLocaleString()}
          </p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Package className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm text-gray-600">Diện Tích</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {warehouse.totalArea || "N/A"}
            <span className="text-sm ml-1">m²</span>
          </p>
        </div>
      </div>

      {/* Warehouse Map */}
      <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Layers className="w-5 h-5 mr-2" />
          Sơ Đồ Kho: {warehouse.warehouseCode}
        </h3>

        <div className="space-y-4">
          {warehouse.zones.map((zone, zoneIdx) => {
            const zoneLocations =
              zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf;
            const zoneCapacity =
              zoneLocations * (zone.capacityPerBin || 100);

            return (
              <div
                key={zoneIdx}
                className="bg-white border-2 border-blue-200 rounded-lg p-4"
              >
                {/* Zone Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-lg">
                      Khu {zone.code} - {zone.name}
                    </h4>
                    {zone.description && (
                      <p className="text-sm text-gray-600">
                        {zone.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Diện tích</p>
                    <p className="text-xl font-bold text-blue-600">
                      {zone.area || "N/A"} m²
                    </p>
                  </div>
                </div>

                {/* Zone Stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Dãy</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {zone.aisles}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Kệ/Dãy</p>
                    <p className="text-2xl font-bold text-green-700">
                      {zone.shelvesPerAisle}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Ô/Kệ</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {zone.binsPerShelf}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Chứa/Ô</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {zone.capacityPerBin || 100}
                    </p>
                  </div>
                </div>

                {/* Visual Representation */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Sơ đồ dãy-kệ-ô:</p>
                    <p className="text-sm text-gray-600">
                      {zone.aisles} dãy × {zone.shelvesPerAisle} kệ ×{" "}
                      {zone.binsPerShelf} ô
                    </p>
                  </div>

                  {/* Aisles Visualization */}
                  <div className="space-y-2">
                    {[...Array(Math.min(zone.aisles, 3))].map(
                      (_, aisleIdx) => (
                        <div key={aisleIdx} className="flex items-center">
                          <div className="w-16 text-xs font-semibold text-gray-600 mr-2">
                            Dãy {String(aisleIdx + 1).padStart(2, "0")}
                          </div>
                          <div className="flex-1 flex gap-1 overflow-x-auto">
                            {[...Array(Math.min(zone.shelvesPerAisle, 10))].map(
                              (_, shelfIdx) => (
                                <div
                                  key={shelfIdx}
                                  className="bg-blue-500 hover:bg-blue-600 transition-colors rounded px-2 py-1 min-w-[40px] text-center cursor-pointer group relative"
                                  title={`Kệ ${String(shelfIdx + 1).padStart(
                                    2,
                                    "0"
                                  )}`}
                                >
                                  <span className="text-white text-xs font-semibold">
                                    {String(shelfIdx + 1).padStart(2, "0")}
                                  </span>
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                    Kệ {String(shelfIdx + 1).padStart(2, "0")}:{" "}
                                    {zone.binsPerShelf} ô
                                  </div>
                                </div>
                              )
                            )}
                            {zone.shelvesPerAisle > 10 && (
                              <div className="flex items-center px-2 text-xs text-gray-500">
                                +{zone.shelvesPerAisle - 10}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                    {zone.aisles > 3 && (
                      <div className="text-center text-xs text-gray-500 py-2">
                        ... và {zone.aisles - 3} dãy khác
                      </div>
                    )}
                  </div>
                </div>

                {/* Zone Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng vị trí khu này</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {zoneLocations.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Sức chứa</p>
                    <p className="text-2xl font-bold text-green-600">
                      {zoneCapacity.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Product Categories */}
                {zone.productCategories &&
                  zone.productCategories.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Loại sản phẩm:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {zone.productCategories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Code Examples */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold mb-3 flex items-center">
          <Grid className="w-5 h-5 mr-2" />
          Ví dụ Mã Vị Trí
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {warehouse.zones.slice(0, 4).map((zone, idx) => (
            <div key={idx} className="bg-white p-3 rounded border">
              <p className="text-xs text-gray-600 mb-1">Khu {zone.code}:</p>
              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded block">
                {warehouse.warehouseCode}-{zone.code}-01-01-01
              </code>
              <p className="text-xs text-gray-500 mt-1">
                Dãy 01, Kệ 01, Ô 01
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarehouseStructurePreview;
