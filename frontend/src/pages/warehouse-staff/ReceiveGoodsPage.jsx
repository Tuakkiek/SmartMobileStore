// ============================================
// FILE: frontend/src/pages/warehouse-staff/ReceiveGoodsPage.jsx
// Trang nhận hàng từ nhà cung cấp (theo luồng)
// ============================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ScanBarcode, 
  Package, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Camera,
  Printer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

const ReceiveGoodsPage = () => {
  const navigate = useNavigate();
  
  // Step 1: Quét mã PO
  const [step, setStep] = useState(1); // 1: Scan PO, 2: Check items, 3: Receive items, 4: Complete
  const [poNumber, setPoNumber] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 2-3: Nhận từng SKU
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [receivedItems, setReceivedItems] = useState([]);
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [damagedQuantity, setDamagedQuantity] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [suggestedLocations, setSuggestedLocations] = useState([]);
  const [qualityStatus, setQualityStatus] = useState("GOOD");
  const [notes, setNotes] = useState("");

  // Step 4: Hoàn tất
  const [signature, setSignature] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Bước 1: Quét mã PO hoặc nhập số PO
  const handleScanPO = async () => {
    if (!poNumber.trim()) {
      toast.error("Vui lòng nhập mã PO");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/warehouse/goods-receipt/start", { poNumber });
      
      setPurchaseOrder(response.data.purchaseOrder);
      setReceivedItems(response.data.purchaseOrder.items.map(() => ({})));
      setStep(2);
      toast.success("Đã tải thông tin đơn hàng");
    } catch (error) {
      console.error("Error scanning PO:", error);
      toast.error(error.response?.data?.message || "Không tìm thấy đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  // Load đề xuất vị trí cho SKU hiện tại
  useEffect(() => {
    if (step === 3 && purchaseOrder) {
      const currentItem = purchaseOrder.items[currentItemIndex];
      if (currentItem) {
        loadLocationSuggestions(currentItem);
      }
    }
  }, [step, currentItemIndex, purchaseOrder]);

  const loadLocationSuggestions = async (item) => {
    try {
      // Giả sử sản phẩm có category, thực tế cần lấy từ UniversalProduct
      const response = await api.post("/warehouse/locations/suggest", {
        sku: item.sku,
        category: "Điện thoại", // TODO: Lấy từ product data
        quantity: item.remainingQuantity,
      });
      
      setSuggestedLocations(response.data.suggestions || []);
      
      // Auto select first suggestion
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSelectedLocation(response.data.suggestions[0]);
      }
    } catch (error) {
      console.error("Error loading location suggestions:", error);
      toast.error("Không thể tải đề xuất vị trí");
    }
  };

  // Nhận hàng cho 1 SKU
  const handleReceiveItem = async () => {
    const currentItem = purchaseOrder.items[currentItemIndex];
    const qty = parseInt(currentQuantity) || 0;
    const damaged = parseInt(damagedQuantity) || 0;

    if (qty === 0) {
      toast.error("Vui lòng nhập số lượng nhận");
      return;
    }

    if (qty > currentItem.remainingQuantity) {
      toast.error(`Số lượng nhận không được vượt quá ${currentItem.remainingQuantity}`);
      return;
    }

    if (!selectedLocation) {
      toast.error("Vui lòng chọn vị trí lưu kho");
      return;
    }

    try {
      setLoading(true);
      
      await api.post("/warehouse/goods-receipt/receive-item", {
        poId: purchaseOrder._id,
        sku: currentItem.sku,
        receivedQuantity: qty,
        damagedQuantity: damaged,
        locationCode: selectedLocation.locationCode,
        qualityStatus,
        notes,
      });

      // Lưu thông tin đã nhận
      const newReceivedItems = [...receivedItems];
      newReceivedItems[currentItemIndex] = {
        sku: currentItem.sku,
        productName: currentItem.productName,
        receivedQuantity: qty,
        damagedQuantity: damaged,
        locationCode: selectedLocation.locationCode,
        qualityStatus,
      };
      setReceivedItems(newReceivedItems);

      toast.success(`Đã nhận ${qty} ${currentItem.productName}`);

      // Reset form
      setCurrentQuantity("");
      setDamagedQuantity("");
      setNotes("");
      setQualityStatus("GOOD");
      setSelectedLocation(null);

      // Chuyển sang SKU tiếp theo hoặc hoàn tất
      if (currentItemIndex < purchaseOrder.items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
      } else {
        setStep(4); // Hoàn tất
      }
    } catch (error) {
      console.error("Error receiving item:", error);
      toast.error(error.response?.data?.message || "Lỗi khi nhận hàng");
    } finally {
      setLoading(false);
    }
  };

  // Hoàn tất nhận hàng
  const handleComplete = async () => {
    try {
      setLoading(true);
      
      const response = await api.post("/warehouse/goods-receipt/complete", {
        poId: purchaseOrder._id,
        deliverySignature: signature,
        notes: "Đã nhận đủ hàng",
      });

      toast.success("Đã hoàn tất nhận hàng!");
      
      // In phiếu nhập kho (optional)
      // printGRN(response.data.goodsReceipt);
      
      // Redirect về dashboard
      setTimeout(() => {
        navigate("/warehouse-staff");
      }, 2000);
    } catch (error) {
      console.error("Error completing receipt:", error);
      toast.error(error.response?.data?.message || "Lỗi khi hoàn tất nhận hàng");
    } finally {
      setLoading(false);
    }
  };

  // RENDER STEP 1: Quét mã PO
  if (step === 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScanBarcode className="w-6 h-6 mr-2" />
              Quét Mã Đơn Hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Quét QR Code trên phiếu giao hàng hoặc nhập mã PO</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  placeholder="Nhập mã PO (VD: PO-202502-001)"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleScanPO()}
                  className="flex-1"
                />
                <Button onClick={handleScanPO} disabled={loading}>
                  {loading ? "Đang tải..." : "Tìm kiếm"}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start">
                <ScanBarcode className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Hướng dẫn:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800">
                    <li>Quét QR code trên phiếu giao hàng từ nhà cung cấp</li>
                    <li>Hoặc nhập mã PO thủ công</li>
                    <li>Hệ thống sẽ hiển thị danh sách hàng hóa cần nhận</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER STEP 2: Hiển thị danh sách sản phẩm
  if (step === 2) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Đơn Hàng: {purchaseOrder.poNumber}</CardTitle>
            <p className="text-sm text-gray-600">
              Nhà cung cấp: {purchaseOrder.supplier.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {purchaseOrder.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{index + 1}. {item.productName}</p>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {item.remainingQuantity} chiếc
                    </p>
                    <p className="text-xs text-gray-500">
                      Đã nhận: {item.receivedQuantity}/{item.orderedQuantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button onClick={() => setStep(3)}>
                Bắt đầu kiểm hàng
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER STEP 3: Nhận từng SKU
  if (step === 3 && purchaseOrder) {
    const currentItem = purchaseOrder.items[currentItemIndex];
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Tiến độ: {currentItemIndex + 1}/{purchaseOrder.items.length}
                </span>
                <Badge>{Math.round(((currentItemIndex + 1) / purchaseOrder.items.length) * 100)}%</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentItemIndex + 1) / purchaseOrder.items.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Item */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                SKU: {currentItem.sku}
              </CardTitle>
              <p className="text-lg font-medium mt-2">{currentItem.productName}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Số lượng */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Số lượng dự kiến</Label>
                  <div className="text-3xl font-bold text-blue-600 mt-1">
                    {currentItem.remainingQuantity}
                  </div>
                </div>
                <div>
                  <Label>Nhập số thực tế *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                    className="text-2xl font-bold mt-1"
                    min="0"
                    max={currentItem.remainingQuantity}
                  />
                </div>
              </div>

              {/* Hàng lỗi */}
              <div>
                <Label>Số lượng lỗi/hư hỏng (nếu có)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={damagedQuantity}
                  onChange={(e) => setDamagedQuantity(e.target.value)}
                  min="0"
                />
              </div>

              {/* Chất lượng */}
              <div>
                <Label>Chất lượng</Label>
                <select
                  value={qualityStatus}
                  onChange={(e) => setQualityStatus(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="GOOD">Tốt</option>
                  <option value="DAMAGED">Hư hỏng</option>
                  <option value="EXPIRED">Hết hạn</option>
                </select>
              </div>

              {/* Chọn vị trí */}
              <div>
                <Label className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Chọn vị trí lưu kho
                </Label>
                
                <div className="space-y-2 mt-2">
                  {suggestedLocations.map((loc, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedLocation(loc)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedLocation?.locationCode === loc.locationCode
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{loc.locationCode}</p>
                          <p className="text-sm text-gray-600">{loc.zoneName}</p>
                          {loc.reason && (
                            <p className="text-xs text-blue-600 mt-1">{loc.reason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={loc.priority === "HIGH" ? "default" : "outline"}>
                            {loc.priority === "HIGH" ? "Đề xuất" : "Khả dụng"}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Còn chỗ: {loc.capacity - loc.currentLoad}/{loc.capacity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <Label>Ghi chú (tùy chọn)</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nhập ghi chú nếu có..."
                  className="w-full mt-1 p-2 border rounded-md"
                  rows="2"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => currentItemIndex > 0 ? setCurrentItemIndex(currentItemIndex - 1) : setStep(2)}
                >
                  Quay lại
                </Button>
                <Button onClick={handleReceiveItem} disabled={loading}>
                  {loading ? "Đang xử lý..." : "Tiếp theo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // RENDER STEP 4: Hoàn tất
  if (step === 4) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="w-6 h-6 mr-2" />
              Đã Nhận Đủ Hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="space-y-3">
              {receivedItems.map((item, index) => (
                item.sku && (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">✓ {item.productName}</p>
                      <p className="text-sm text-gray-600">Vị trí: {item.locationCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.receivedQuantity} chiếc</p>
                      {item.damagedQuantity > 0 && (
                        <p className="text-xs text-red-600">Lỗi: {item.damagedQuantity}</p>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Signature */}
            <div>
              <Label>Chữ ký người giao hàng</Label>
              <div className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Chụp ảnh chữ ký
                </Button>
                {signature && (
                  <p className="text-sm text-green-600 mt-2">✓ Đã có chữ ký</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button variant="outline" className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                In phiếu
              </Button>
              <Button onClick={handleComplete} disabled={loading} className="flex-1">
                {loading ? "Đang xử lý..." : "Hoàn tất"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ReceiveGoodsPage;
