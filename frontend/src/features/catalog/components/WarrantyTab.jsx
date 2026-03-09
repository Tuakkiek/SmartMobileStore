import React from "react";
import {
  Check,
  Clock,
  Gift,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Truck,
} from "lucide-react";
import {
  formatIdentifierPolicy,
  formatWarrantyDuration,
  isSerializedProduct,
  resolveAfterSalesConfig,
} from "@/features/afterSales/utils/afterSales";

export const WarrantyTab = ({ product }) => {
  const config = resolveAfterSalesConfig(product);
  const serializedTracking = isSerializedProduct(product);
  const warrantyDuration = formatWarrantyDuration(config.warrantyMonths);
  const identifierPolicy = formatIdentifierPolicy(config.identifierPolicy);
  const warrantyTerms =
    config.warrantyTerms ||
    "Áp dụng cho lỗi phần cứng theo điều kiện bảo hành của cửa hàng và nhà sản xuất.";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Gift className="h-8 w-8" />
          <div>
            <h3 className="text-xl font-bold">Dịch vụ sau bán hàng</h3>
            <p className="mt-1 text-sm text-orange-50">
              Thiết bị được quản lý hậu mãi theo mã định danh riêng, tương tự quy
              trình check coverage chuyên nghiệp.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <p className="text-lg font-bold text-blue-900">{warrantyDuration}</p>
          <p className="mt-1 text-sm text-slate-700">Thời hạn bảo hành áp dụng cho sản phẩm này.</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Smartphone className="h-6 w-6" />
          </div>
          <p className="text-lg font-bold text-emerald-900">{identifierPolicy}</p>
          <p className="mt-1 text-sm text-slate-700">Mã định danh dùng để kích hoạt và tra cứu bảo hành.</p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
            <RefreshCw className="h-6 w-6" />
          </div>
          <p className="text-lg font-bold text-orange-900">
            {serializedTracking ? "Có theo dõi từng máy" : "Theo dõi theo sản phẩm"}
          </p>
          <p className="mt-1 text-sm text-slate-700">Thiết bị sau bán được quản lý theo vòng đời phù hợp.</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-slate-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Chính sách bảo hành
          </h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex gap-3">
            <div className="mt-1 rounded-full bg-blue-100 p-2 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Thời hạn coverage</p>
              <p className="text-sm text-slate-600">
                Bảo hành được tính từ ngày bàn giao thiết bị và kéo dài trong {warrantyDuration.toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-1 rounded-full bg-emerald-100 p-2 text-emerald-600">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Tra cứu theo mã định danh</p>
              <p className="text-sm text-slate-600">
                Khách hàng có thể kiểm tra trạng thái bảo hành bằng {identifierPolicy.toLowerCase()} trên trang tra cứu công khai.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-1 rounded-full bg-amber-100 p-2 text-amber-600">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Điều khoản áp dụng</p>
              <p className="text-sm text-slate-600">{warrantyTerms}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="border-b bg-orange-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-orange-900">
            <RefreshCw className="h-5 w-5" />
            Chính sách đổi trả & hỗ trợ
          </h3>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Hỗ trợ kiểm tra bảo hành nhanh theo mã định danh sau khi bán.</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Thiết bị serialized được lưu lịch sử trạng thái từ nhập kho đến sau bán.</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Đổi trả và xử lý sửa chữa được theo dõi xuyên suốt trên cùng hồ sơ thiết bị.</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Truck className="mt-0.5 h-4 w-4 text-blue-600" />
              <span>Miễn phí giao hàng toàn quốc, kiểm tra máy trước khi nhận.</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Gift className="mt-0.5 h-4 w-4 text-orange-600" />
              <span>Khuyến mãi và chính sách hậu mãi có thể thay đổi theo từng dòng sản phẩm.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyTab;
