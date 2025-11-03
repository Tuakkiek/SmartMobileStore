import React from "react";
import { Shield, RefreshCw, Check, Truck } from "lucide-react";

export const WarrantyTab = () => {
  return (
    <div className="space-y-6">
      {/* Main Warranty */}
      <div className="flex items-start gap-4 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <Shield className="w-8 h-8 text-blue-600 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-lg mb-2 text-blue-900">
            Bảo hành chính hãng 12 tháng
          </h3>
          <p className="text-gray-700 mb-3">
            Sản phẩm được bảo hành chính hãng tại các trung tâm Apple trên toàn quốc.
          </p>
          <ul className="mt-4 space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Thời gian bảo hành: 12 tháng kể từ ngày mua (theo hóa đơn)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Bảo hành tại trung tâm ủy quyền Apple toàn quốc</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Warranty Conditions */}
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-200">
          <h3 className="font-bold text-lg">Điều kiện bảo hành</h3>
        </div>
        <div className="p-6 space-y-3 text-gray-700">
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Sản phẩm 100% chính hãng, nguyên seal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Lỗi do nhà sản xuất sẽ được xử lý theo chính sách Apple</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>
                Không bảo hành: rơi vỡ, ngấm nước, can thiệp phần mềm trái phép
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Return Policy */}
      <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-xl">
        <div className="flex items-start gap-4">
          <RefreshCw className="w-8 h-8 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg mb-2 text-amber-900">
              Đổi trả trong 30 ngày
            </h3>
            <p className="text-gray-700 mb-3">
              1 đổi 1 nếu lỗi phần cứng do nhà sản xuất.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Sản phẩm giữ nguyên hình thức, không xước</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Đầy đủ hộp, phụ kiện, hóa đơn</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Service Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border-2 border-gray-200 rounded-xl text-center">
          <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h4 className="font-bold mb-2">Bảo hành 12 tháng</h4>
          <p className="text-sm text-gray-600">Chính hãng Apple</p>
        </div>
        <div className="p-6 border-2 border-gray-200 rounded-xl text-center">
          <Truck className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h4 className="font-bold mb-2">Miễn phí vận chuyển</h4>
          <p className="text-sm text-gray-600">Toàn quốc</p>
        </div>
        <div className="p-6 border-2 border-gray-200 rounded-xl text-center">
          <RefreshCw className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h4 className="font-bold mb-2">Đổi trả 30 ngày</h4>
          <p className="text-sm text-gray-600">Lỗi NSX hoàn tiền 100%</p>
        </div>
      </div>
    </div>
  );
};