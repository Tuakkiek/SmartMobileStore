import React, { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  History,
  Loader2,
  Search,
  ShieldCheck,
  Smartphone,
  Upload,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/shared/lib/http/httpClient";
import { afterSalesAPI } from "../api/afterSales.api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

const INVENTORY_STATES = ["ALL", "IN_STOCK", "RESERVED", "SOLD", "RETURNED", "SCRAPPED"];
const SERVICE_STATES = ["ALL", "NONE", "UNDER_WARRANTY", "UNDER_REPAIR", "REPAIRED", "WARRANTY_VOID"];
const WARRANTY_STATUSES = ["ALL", "ACTIVE", "EXPIRED", "VOID", "REPLACED"];

const formatDate = (value, withTime = false) => {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("vi-VN", withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(new Date(value));
};

const parseSerializedUnits = (input) =>
  String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,\t|;]/).map((item) => item.trim()).filter(Boolean);
      const first = parts[0] || "";
      const second = parts[1] || "";
      return /^\d{8,}$/.test(first.replace(/\s+/g, ""))
        ? { imei: first.replace(/\s+/g, ""), serialNumber: second }
        : { imei: "", serialNumber: first };
    });

const DeviceManagementPage = () => {
  const [tab, setTab] = useState("devices");
  const [devices, setDevices] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingWarranties, setLoadingWarranties] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deviceFilters, setDeviceFilters] = useState({
    identifier: "",
    variantSku: "",
    inventoryState: "ALL",
    serviceState: "ALL",
  });
  const [warrantyFilters, setWarrantyFilters] = useState({
    variantSku: "",
    status: "ALL",
  });
  const [variantSearch, setVariantSearch] = useState("");
  const [variantOptions, setVariantOptions] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [importForm, setImportForm] = useState({
    warehouseLocationCode: "",
    notes: "",
    serializedInput: "",
  });
  const [serviceForm, setServiceForm] = useState({ serviceState: "NONE", notes: "" });
  const [warrantyForm, setWarrantyForm] = useState({ id: "", status: "ACTIVE", notes: "" });
  const [busy, setBusy] = useState(false);

  const selectedWarranty = useMemo(
    () => warranties.find((item) => String(item.deviceId) === String(selectedDevice?._id || "")) || null,
    [selectedDevice, warranties]
  );

  const stats = useMemo(
    () => ({
      totalDevices: devices.length,
      inStock: devices.filter((item) => item.inventoryState === "IN_STOCK").length,
      activeWarranty: warranties.filter((item) => item.status === "ACTIVE").length,
      totalWarranties: warranties.length,
    }),
    [devices, warranties]
  );

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const params = {};
      if (deviceFilters.identifier.trim()) params.identifier = deviceFilters.identifier.trim();
      if (deviceFilters.variantSku.trim()) params.variantSku = deviceFilters.variantSku.trim();
      if (deviceFilters.inventoryState !== "ALL") params.inventoryState = deviceFilters.inventoryState;
      if (deviceFilters.serviceState !== "ALL") params.serviceState = deviceFilters.serviceState;
      const res = await afterSalesAPI.listDevices(params);
      setDevices(res.data?.data?.devices || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải danh sách thiết bị");
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadWarranties = async () => {
    setLoadingWarranties(true);
    try {
      const params = {};
      if (warrantyFilters.variantSku.trim()) params.variantSku = warrantyFilters.variantSku.trim();
      if (warrantyFilters.status !== "ALL") params.status = warrantyFilters.status;
      const res = await afterSalesAPI.listWarranties(params);
      setWarranties(res.data?.data?.warranties || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải hồ sơ bảo hành");
    } finally {
      setLoadingWarranties(false);
    }
  };

  const loadHistory = async (deviceId) => {
    if (!deviceId) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await afterSalesAPI.getDeviceHistory(deviceId);
      setHistory(res.data?.data?.history || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch sử thiết bị");
    } finally {
      setLoadingHistory(false);
    }
  };

  const searchVariants = async (query) => {
    if (String(query || "").trim().length < 2) {
      setVariantOptions([]);
      return;
    }
    try {
      const res = await api.get("/universal-products", {
        params: { search: String(query).trim(), limit: 10 },
      });
      const products = res.data?.data?.products || [];
      const flattened = [];
      for (const product of products) {
        for (const variant of product.variants || []) {
          flattened.push({
            productId: product._id,
            variantId: variant._id,
            variantSku: variant.sku,
            productName: product.name,
            variantName: `${variant.color || "N/A"} - ${variant.variantName || "Base"}`,
          });
        }
      }
      setVariantOptions(flattened);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tìm biến thể sản phẩm");
    }
  };

  useEffect(() => {
    loadDevices();
  }, [deviceFilters.inventoryState, deviceFilters.serviceState]);

  useEffect(() => {
    loadWarranties();
  }, [warrantyFilters.status]);

  useEffect(() => {
    const timer = setTimeout(() => searchVariants(variantSearch), 300);
    return () => clearTimeout(timer);
  }, [variantSearch]);

  useEffect(() => {
    loadHistory(selectedDevice?._id);
    setServiceForm({
      serviceState: selectedDevice?.serviceState || "NONE",
      notes: "",
    });
  }, [selectedDevice]);

  useEffect(() => {
    setWarrantyForm({
      id: selectedWarranty?._id || "",
      status: selectedWarranty?.status || "ACTIVE",
      notes: "",
    });
  }, [selectedWarranty]);

  const handleImport = async (event) => {
    event.preventDefault();
    if (!selectedVariant) return toast.error("Vui lòng chọn biến thể sản phẩm");
    const serializedUnits = parseSerializedUnits(importForm.serializedInput);
    if (!serializedUnits.length) return toast.error("Vui lòng nhập IMEI hoặc serial");

    setBusy(true);
    try {
      await afterSalesAPI.importDevices({
        ...selectedVariant,
        warehouseLocationCode: importForm.warehouseLocationCode.trim(),
        notes: importForm.notes.trim(),
        serializedUnits,
      });
      toast.success(`Đã nhập ${serializedUnits.length} thiết bị`);
      setImportForm({ warehouseLocationCode: "", notes: "", serializedInput: "" });
      setSelectedVariant(null);
      setVariantSearch("");
      setVariantOptions([]);
      loadDevices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể nhập thiết bị");
    } finally {
      setBusy(false);
    }
  };

  const handleServiceUpdate = async () => {
    if (!selectedDevice?._id) return toast.error("Chọn một thiết bị trước");
    setBusy(true);
    try {
      await afterSalesAPI.updateDeviceServiceState(selectedDevice._id, serviceForm);
      toast.success("Đã cập nhật trạng thái thiết bị");
      loadDevices();
      loadHistory(selectedDevice._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật trạng thái thiết bị");
    } finally {
      setBusy(false);
    }
  };

  const handleWarrantyUpdate = async () => {
    if (!warrantyForm.id) return toast.error("Thiết bị này chưa có hồ sơ bảo hành");
    setBusy(true);
    try {
      await afterSalesAPI.updateWarrantyStatus(warrantyForm.id, {
        status: warrantyForm.status,
        notes: warrantyForm.notes,
      });
      toast.success("Đã cập nhật hồ sơ bảo hành");
      loadWarranties();
      if (selectedDevice?._id) loadHistory(selectedDevice._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật bảo hành");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý thiết bị & bảo hành</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi IMEI/serial, vòng đời thiết bị và coverage sau bán.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Thiết bị</p><p className="text-2xl font-bold">{stats.totalDevices}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Trong kho</p><p className="text-2xl font-bold">{stats.inStock}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Hồ sơ BH</p><p className="text-2xl font-bold">{stats.totalWarranties}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">BH active</p><p className="text-2xl font-bold">{stats.activeWarranty}</p></CardContent></Card>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[520px]">
          <TabsTrigger value="devices" className="gap-2"><Smartphone className="h-4 w-4" />Thiết bị</TabsTrigger>
          <TabsTrigger value="import" className="gap-2"><Upload className="h-4 w-4" />Nhập IMEI</TabsTrigger>
          <TabsTrigger value="warranties" className="gap-2"><ShieldCheck className="h-4 w-4" />Bảo hành</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Danh sách thiết bị</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Input value={deviceFilters.identifier} onChange={(e) => setDeviceFilters((p) => ({ ...p, identifier: e.target.value }))} placeholder="IMEI / Serial" />
                <Input value={deviceFilters.variantSku} onChange={(e) => setDeviceFilters((p) => ({ ...p, variantSku: e.target.value }))} placeholder="SKU" />
                <Select value={deviceFilters.inventoryState} onValueChange={(value) => setDeviceFilters((p) => ({ ...p, inventoryState: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INVENTORY_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={deviceFilters.serviceState} onValueChange={(value) => setDeviceFilters((p) => ({ ...p, serviceState: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={loadDevices}>Làm mới</Button>
              </div>

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thiết bị</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Tồn kho</TableHead>
                      <TableHead>Hậu mãi</TableHead>
                      <TableHead>Vị trí</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDevices ? (
                      <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" /></TableCell></TableRow>
                    ) : devices.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Chưa có thiết bị phù hợp.</TableCell></TableRow>
                    ) : devices.map((device) => (
                      <TableRow key={device._id} className={`cursor-pointer ${selectedDevice?._id === device._id ? "bg-orange-50" : ""}`} onClick={() => setSelectedDevice(device)}>
                        <TableCell><div><p className="font-medium">{device.productName}</p><p className="font-mono text-xs text-slate-500">{device.imei || device.serialNumber || "N/A"}</p></div></TableCell>
                        <TableCell className="font-mono text-xs">{device.variantSku}</TableCell>
                        <TableCell>{device.inventoryState}</TableCell>
                        <TableCell>{device.serviceState}</TableCell>
                        <TableCell>{device.warehouseLocationCode || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-slate-500" />Chi tiết & cập nhật</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!selectedDevice ? (
                  <div className="rounded-xl border border-dashed py-16 text-center text-slate-500">Chọn một thiết bị để xem chi tiết.</div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">IMEI</p><p className="mt-2 font-mono text-sm">{selectedDevice.imei || "N/A"}</p></div>
                      <div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">Serial</p><p className="mt-2 font-mono text-sm">{selectedDevice.serialNumber || "N/A"}</p></div>
                      <div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">Ngày nhập</p><p className="mt-2 text-sm">{formatDate(selectedDevice.receivedAt || selectedDevice.createdAt, true)}</p></div>
                      <div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">Khách hàng</p><p className="mt-2 text-sm">{selectedDevice.saleSnapshot?.customerName || "Chưa bán"}</p></div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Trạng thái hậu mãi</Label>
                        <Select value={serviceForm.serviceState} onValueChange={(value) => setServiceForm((p) => ({ ...p, serviceState: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{SERVICE_STATES.filter((state) => state !== "ALL").map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ghi chú thiết bị</Label>
                        <Input value={serviceForm.notes} onChange={(e) => setServiceForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Ví dụ: Đang chờ kiểm tra" />
                      </div>
                    </div>
                    <Button onClick={handleServiceUpdate} disabled={busy}>Cập nhật trạng thái thiết bị</Button>

                    <div className="rounded-xl border bg-orange-50 p-4">
                      <p className="text-sm font-semibold">Hồ sơ bảo hành</p>
                      {selectedWarranty ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                          <Select value={warrantyForm.status} onValueChange={(value) => setWarrantyForm((p) => ({ ...p, status: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{WARRANTY_STATUSES.filter((state) => state !== "ALL").map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input value={warrantyForm.notes} onChange={(e) => setWarrantyForm((p) => ({ ...p, notes: e.target.value }))} placeholder={`Hết hạn: ${formatDate(selectedWarranty.expiresAt)}`} />
                          <Button variant="outline" onClick={handleWarrantyUpdate} disabled={busy}>Lưu</Button>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">Thiết bị này chưa có hồ sơ bảo hành.</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-slate-500" />Lịch sử vòng đời</CardTitle></CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" /></div>
                ) : history.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-16 text-center text-slate-500">Chưa có lịch sử cho thiết bị đang chọn.</div>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry) => (
                      <div key={entry._id} className="flex gap-3 rounded-xl border p-4">
                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Clock3 className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="font-medium">{entry.eventType}</p>
                          <p className="mt-1 text-sm text-slate-500">{entry.actorName || "System"} • {formatDate(entry.createdAt, true)}</p>
                          <p className="mt-2 text-sm text-slate-700">{entry.fromInventoryState || "N/A"} → {entry.toInventoryState || "N/A"}</p>
                          {entry.note ? <p className="mt-2 text-sm text-slate-600">{entry.note}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-slate-500" />Nhập thiết bị serialized</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={variantSearch} onChange={(e) => setVariantSearch(e.target.value)} className="pl-10" placeholder="Tìm theo tên sản phẩm hoặc SKU" />
                </div>
                <Button variant="outline" onClick={() => searchVariants(variantSearch)}>Tìm biến thể</Button>
              </div>

              {variantOptions.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {variantOptions.map((variant) => (
                    <button
                      key={variant.variantId}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`rounded-xl border p-4 text-left ${selectedVariant?.variantId === variant.variantId ? "border-orange-400 bg-orange-50" : "border-slate-200"}`}
                    >
                      <p className="font-medium">{variant.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">{variant.variantName}</p>
                      <p className="mt-2 font-mono text-xs">{variant.variantSku}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              <form className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]" onSubmit={handleImport}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Biến thể đã chọn</Label>
                    <Input
                      readOnly
                      value={selectedVariant ? `${selectedVariant.productName} • ${selectedVariant.variantName} • ${selectedVariant.variantSku}` : ""}
                      placeholder="Chọn biến thể cần nhập"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mã vị trí kho</Label>
                    <Input value={importForm.warehouseLocationCode} onChange={(e) => setImportForm((p) => ({ ...p, warehouseLocationCode: e.target.value }))} placeholder="Ví dụ: A-01-02-03" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ghi chú lô hàng</Label>
                    <Input value={importForm.notes} onChange={(e) => setImportForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Ví dụ: Lô PO-2026-03" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Danh sách IMEI / Serial</Label>
                  <Textarea
                    value={importForm.serializedInput}
                    onChange={(e) => setImportForm((p) => ({ ...p, serializedInput: e.target.value }))}
                    className="min-h-[260px] font-mono text-sm"
                    placeholder={"356789012345678\n356789012345679,SN-IP15-0002\nSN-MBP-2026-0001"}
                  />
                  <p className="text-xs text-slate-500">Mỗi dòng là `IMEI`, `IMEI,SERIAL` hoặc `SERIAL`.</p>
                  <Button type="submit" disabled={busy}>Xác nhận nhập thiết bị</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warranties">
          <Card>
            <CardHeader><CardTitle>Danh sách hồ sơ bảo hành</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input value={warrantyFilters.variantSku} onChange={(e) => setWarrantyFilters((p) => ({ ...p, variantSku: e.target.value }))} placeholder="Lọc theo SKU" />
                <Select value={warrantyFilters.status} onValueChange={(value) => setWarrantyFilters((p) => ({ ...p, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WARRANTY_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={loadWarranties}>Làm mới</Button>
              </div>

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Định danh</TableHead>
                      <TableHead>Hết hạn</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingWarranties ? (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" /></TableCell></TableRow>
                    ) : warranties.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">Chưa có hồ sơ bảo hành phù hợp.</TableCell></TableRow>
                    ) : warranties.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell><div><p className="font-medium">{item.productName}</p><p className="font-mono text-xs text-slate-500">{item.variantSku}</p></div></TableCell>
                        <TableCell className="font-mono text-xs">{item.imei || item.serialNumber || "N/A"}</TableCell>
                        <TableCell>{formatDate(item.expiresAt)}</TableCell>
                        <TableCell>{item.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeviceManagementPage;
