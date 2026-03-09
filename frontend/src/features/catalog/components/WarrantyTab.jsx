import React from "react";
import { Shield, RefreshCw, Check, Truck, Gift, Clock } from "lucide-react";

export const WarrantyTab = () => {
  return (
    <div className="space-y-6">
      {/* Promotion Banner */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-8 h-8" />
          <h3 className="text-xl font-bold">Ưu đãi đặc biệt</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">Trả góp 0% - Không lãi suất</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">Miễn phí vận chuyển toàn quốc</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">AirPods giảm đến 500.000đ khi mua kèm</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">Thu cũ đổi mới - Trợ giá cao</span>
          </div>
        </div>
      </div>

      {/* Main Warranty Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center hover:shadow-lg transition-all">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-blue-900">
            Bảo hành 12 tháng
          </h3>
          <p className="text-sm text-gray-700">
            Chính hãng Apple tại các trung tâm ủy quyền toàn quốc
          </p>
        </div>

        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center hover:shadow-lg transition-all">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-green-900">
            Giao hàng miễn phí
          </h3>
          <p className="text-sm text-gray-700">
            Giao hàng tận nơi toàn quốc, kiểm tra trước khi thanh toán
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 text-center hover:shadow-lg transition-all">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-purple-900">
            Đổi trả 30 ngày
          </h3>
          <p className="text-sm text-gray-700">
            1 đổi 1 nếu lỗi phần cứng do nhà sản xuất trong 30 ngày đầu
          </p>
        </div>
      </div>

      {/* Warranty Details */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b-2 border-blue-200">
          <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Chính sách bảo hành
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">
                Thời gian bảo hành: 12 tháng
              </p>
              <p className="text-sm text-gray-600">
                Tính từ ngày mua hàng trên hóa đơn. Bảo hành tại các trung tâm
                Apple ủy quyền trên toàn quốc.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">
                Điều kiện bảo hành
              </p>
              <p className="text-sm text-gray-600">
                Sản phẩm 100% chính hãng, nguyên seal. Lỗi do nhà sản xuất sẽ
                được xử lý theo chính sách Apple.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-600 font-bold text-sm">✕</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">
                Không bảo hành
              </p>
              <p className="text-sm text-gray-600">
                Rơi vỡ, va đập, ngấm nước, cháy nổ, can thiệp phần mềm trái
                phép, hoặc tự ý sửa chữa.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Return Policy */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b-2 border-orange-200">
          <h3 className="font-bold text-lg text-orange-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Chính sách đổi trả
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  Đổi trả trong 30 ngày
                </p>
                <p className="text-sm text-gray-600">
                  1 đổi 1 nếu phát hiện lỗi phần cứng do nhà sản xuất trong
                  vòng 30 ngày đầu sử dụng.
                </p>
              </div>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p className="font-semibold text-sm text-orange-900 mb-2">
                Điều kiện đổi trả:
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>Sản phẩm giữ nguyên hình thức, không trầy xước</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>Đầy đủ hộp, phụ kiện đi kèm</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>Còn hóa đơn mua hàng</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
          <h3 className="font-bold text-lg mb-3 text-green-900 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Thu cũ đổi mới
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Thu cũ trợ giá lên đến 100% giá trị máy</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Định giá nhanh, thanh toán ngay</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-lg mb-3 text-blue-900 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Dịch vụ giao hàng
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Giao hàng miễn phí toàn quốc</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Kiểm tra sản phẩm trước khi thanh toán</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};