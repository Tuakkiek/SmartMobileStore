import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Search,
  ShieldCheck,
  ShieldX,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { afterSalesAPI } from "../api/afterSales.api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

const STATUS_STYLES = {
  ACTIVE: {
    label: "Còn bảo hành",
    className: "bg-emerald-100 text-emerald-700",
  },
  EXPIRED: {
    label: "Hết bảo hành",
    className: "bg-slate-200 text-slate-700",
  },
  VOID: {
    label: "Bảo hành vô hiệu",
    className: "bg-rose-100 text-rose-700",
  },
  REPLACED: {
    label: "Đã đổi máy",
    className: "bg-amber-100 text-amber-700",
  },
};

const formatDate = (value) => {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
};

const formatRemaining = (days) => {
  const normalizedDays = Number(days) || 0;
  if (normalizedDays <= 0) return "Đã hết hạn";
  const months = Math.floor(normalizedDays / 30);
  const remainingDays = normalizedDays % 30;
  if (months <= 0) return `${remainingDays} ngày`;
  if (remainingDays === 0) return `${months} tháng`;
  return `${months} tháng ${remainingDays} ngày`;
};

const WarrantyLookupPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusMeta = useMemo(() => {
    const status = String(result?.warrantyStatus || "").toUpperCase();
    return STATUS_STYLES[status] || STATUS_STYLES.EXPIRED;
  }, [result]);

  const handleLookup = async (event) => {
    event?.preventDefault?.();

    const normalizedIdentifier = String(identifier || "").trim();
    if (!normalizedIdentifier) {
      toast.error("Vui lòng nhập IMEI hoặc số serial");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await afterSalesAPI.warrantyLookup(normalizedIdentifier);
      setResult(response.data?.data || null);
    } catch (error) {
      setResult(null);
      toast.error(
        error.response?.data?.message ||
          "Không tìm thấy thông tin bảo hành cho thiết bị này"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,215,170,0.45),_transparent_34%),linear-gradient(180deg,_#fff7ed_0%,_#ffffff_48%,_#f8fafc_100%)]">
      <div className="container mx-auto px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="rounded-3xl border border-orange-200 bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(194,65,12,0.55)] backdrop-blur sm:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                  <ShieldCheck className="h-4 w-4" />
                  Kiểm tra bảo hành thiết bị
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Tra cứu bảo hành bằng IMEI hoặc Serial Number
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Nhập mã định danh của thiết bị để xem ngày mua, hạn bảo hành và
                  trạng thái coverage hiện tại.
                </p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-300/50">
                <Smartphone className="h-10 w-10" />
              </div>
            </div>

            <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleLookup}>
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Ví dụ: 356789012345678 hoặc SN-ABC-2026"
                className="h-12 border-orange-200 bg-orange-50/40 text-base"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <Search className="h-4 w-4" />
                {loading ? "Đang kiểm tra..." : "Kiểm tra bảo hành"}
              </Button>
            </form>
          </div>

          {result && (
            <Card className="border-slate-200 shadow-xl shadow-slate-200/60">
              <CardHeader className="border-b bg-slate-50/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl text-slate-900">
                      {result.productName}
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Thiết bị: {result.identifier}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ngày mua
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatDate(result.purchaseDate)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Hạn bảo hành
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatDate(result.warrantyExpirationDate)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Thời gian còn lại
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatRemaining(result.remainingWarrantyDays)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                    {String(result.warrantyStatus || "").toUpperCase() === "ACTIVE" ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <ShieldX className="h-5 w-5" />
                    )}
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Trạng thái
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {statusMeta.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {searched && !result && !loading && (
            <Card className="border-dashed border-slate-300 bg-white/85">
              <CardContent className="py-12 text-center">
                <ShieldX className="mx-auto h-10 w-10 text-slate-400" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  Không tìm thấy thông tin bảo hành
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Kiểm tra lại IMEI hoặc số serial, sau đó thử tra cứu lại.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarrantyLookupPage;
