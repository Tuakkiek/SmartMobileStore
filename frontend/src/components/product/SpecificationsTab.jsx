import React from "react";
import { Package, Clock, CreditCard } from "lucide-react";

export const SpecificationsTab = ({ specifications = {} }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Thông số kỹ thuật</h2>

      {/* Quick Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specifications.screenSize && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Package className="w-10 h-10 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Màn hình</p>
              <p className="font-semibold">{specifications.screenSize}</p>
            </div>
          </div>
        )}
        {specifications.battery && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Clock className="w-10 h-10 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Pin</p>
              <p className="font-semibold">{specifications.battery}</p>
            </div>
          </div>
        )}
        {specifications.rearCamera && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <CreditCard className="w-10 h-10 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Camera sau</p>
              <p className="font-semibold">{specifications.rearCamera}</p>
            </div>
          </div>
        )}
      </div>

      {/* CPU Section */}
      {specifications.chip && (
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-red-600 text-white px-6 py-3">
            <h3 className="font-bold text-lg">Bộ xử lý</h3>
          </div>
          <div className="divide-y">
            <div className="flex px-6 py-3">
              <span className="w-1/3 text-gray-600">Loại CPU</span>
              <span className="w-2/3 font-medium">{specifications.chip}</span>
            </div>
            {specifications.ram && (
              <div className="flex px-6 py-3 bg-gray-50">
                <span className="w-1/3 text-gray-600">RAM</span>
                <span className="w-2/3 font-medium">{specifications.ram}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RAM Section */}
      {specifications.storage && (
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-red-600 text-white px-6 py-3">
            <h3 className="font-bold text-lg">Bộ nhớ</h3>
          </div>
          <div className="px-6 py-3">
            <span className="font-medium">{specifications.storage}</span>
          </div>
        </div>
      )}
    </div>
  );
};