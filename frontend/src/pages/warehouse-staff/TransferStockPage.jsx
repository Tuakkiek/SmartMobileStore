import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, MapPin, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

const TransferStockPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Input, 2: Confirm, 3: Complete
  const [loading, setLoading] = useState(false);

  // Form data
  const [sku, setSku] = useState("");
  const [fromLocationCode, setFromLocationCode] = useState("");
  const [toLocationCode, setToLocationCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Validation data
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [availableQty, setAvailableQty] = useState(0);
  const [transferResult, setTransferResult] = useState(null);

  const validateTransfer = async () => {
    if (!sku.trim() || !fromLocationCode.trim() || !toLocationCode.trim() || !quantity) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (fromLocationCode === toLocationCode) {
      toast.error("Vị trí nguồn và đích không được trùng nhau");
      return;
    }

    if (parseInt(quantity) <= 0) {
      toast.error("Số lượng phải lớn hơn 0");
      return;
    }

    try {
      setLoading(true);

      // Validate from location
      const fromRes = await api.get(`/warehouse/locations/${fromLocationCode}`);
      setFromLocation(fromRes.data.location);

      // Check available stock
      const invRes = await api.get(`/warehouse/inventory/search?sku=${sku}`);
      const inv = invRes.data.inventory?.find((i) => i.locationCode === fromLocationCode);
      if (!inv || inv.quantity < parseInt(quantity)) {
        toast.error(`Không đủ hàng tại ${fromLocationCode}. Tồn: ${inv?.quantity || 0}`);
        setLoading(false);
        return;
      }
      setAvailableQty(inv.quantity);

      // Validate to location
      const toRes = await api.get(`/warehouse/locations/${toLocationCode}`);
      setToLocation(toRes.data.location);

      if (!toRes.data.location.status || toRes.data.location.status !== "ACTIVE") {
        toast.error("Vị trí đích không khả dụng");
        setLoading(false);
        return;
      }

      const remaining = toRes.data.location.capacity - toRes.data.location.currentLoad;
      if (remaining < parseInt(quantity)) {
        toast.error(`Vị trí đích không đủ chỗ. Còn trống: ${remaining}`);
        setLoading(false);
        return;
      }

      setStep(2);
      toast.success("Thông tin hợp lệ, vui lòng xác nhận");
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error.response?.data?.message || "Lỗi khi kiểm tra thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      setLoading(true);
      const response = await api.post("/warehouse/transfer", {
        sku,
        fromLocationCode,
        toLocationCode,
        quantity: parseInt(quantity),
        reason,
        notes,
      });

      setTransferResult(response.data);
      setStep(3);
      toast.success("Chuyển kho thành công!");
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error(error.response?.data?.message || "Lỗi khi chuyển kho");
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Nhập thông tin
  if (step === 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="w-6 h-6 mr-2" />
              Chuyển Kho Nội Bộ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Mã SKU sản phẩm *</Label>
              <Input placeholder="Nhập mã SKU" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-red-500" />Từ vị trí *</Label>
                <Input placeholder="VD: WH-HCM-A-01-01-01" value={fromLocationCode} onChange={(e) => setFromLocationCode(e.target.value.toUpperCase())} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-green-500" />Đến vị trí *</Label>
                <Input placeholder="VD: WH-HCM-B-02-01-01" value={toLocationCode} onChange={(e) => setToLocationCode(e.target.value.toUpperCase())} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Số lượng *</Label>
              <Input type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="mt-1" />
            </div>

            <div>
              <Label>Lý do chuyển kho</Label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                <option value="">Chọn lý do...</option>
                <option value="OPTIMIZATION">Tối ưu vị trí</option>
                <option value="DAMAGE">Hàng hư hỏng</option>
                <option value="RESTOCK">Bổ sung kệ trưng bày</option>
                <option value="CONSOLIDATION">Gộp hàng</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <Label>Ghi chú</Label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nhập ghi chú nếu có..." className="w-full mt-1 p-2 border rounded-md" rows="2" />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => navigate("/warehouse-staff")}>Hủy</Button>
              <Button onClick={validateTransfer} disabled={loading}>{loading ? "Đang kiểm tra..." : "Tiếp tục"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 2: Xác nhận
  if (step === 2) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-yellow-500" />
              Xác Nhận Chuyển Kho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">SKU:</span><span className="font-semibold">{sku}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Số lượng:</span><span className="font-semibold text-lg">{quantity} chiếc</span></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="text-center flex-1">
                <MapPin className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="font-bold text-lg">{fromLocationCode}</p>
                <p className="text-sm text-gray-600">{fromLocation?.zoneName}</p>
                <p className="text-xs text-gray-500 mt-1">Tồn kho: {availableQty}</p>
              </div>
              <ArrowRight className="w-8 h-8 text-blue-500 mx-4" />
              <div className="text-center flex-1">
                <MapPin className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="font-bold text-lg">{toLocationCode}</p>
                <p className="text-sm text-gray-600">{toLocation?.zoneName}</p>
                <p className="text-xs text-gray-500 mt-1">Trống: {toLocation?.capacity - toLocation?.currentLoad}/{toLocation?.capacity}</p>
              </div>
            </div>

            {reason && (
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Lý do:</span>
                <Badge variant="outline">{reason}</Badge>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
              <Button onClick={handleTransfer} disabled={loading} className="bg-blue-600 hover:bg-blue-700">{loading ? "Đang xử lý..." : "Xác nhận chuyển kho"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 3: Hoàn tất
  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="w-6 h-6 mr-2" />
              Chuyển Kho Thành Công
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Hoàn tất!</h3>
              <p className="text-gray-600">Đã chuyển {quantity} {sku} thành công</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span>Từ vị trí:</span><span className="font-medium">{fromLocationCode}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span>Đến vị trí:</span><span className="font-medium">{toLocationCode}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span>Số lượng:</span><span className="font-medium">{quantity} chiếc</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => { setStep(1); setSku(""); setFromLocationCode(""); setToLocationCode(""); setQuantity(""); setReason(""); setNotes(""); }}>Chuyển tiếp</Button>
              <Button onClick={() => navigate("/warehouse-staff")} className="flex-1">Về Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default TransferStockPage;
