import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, MapPin, Navigation, CheckCircle, Printer, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

const PickOrdersPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [step, setStep] = useState(1);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pickList, setPickList] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unpickableItems, setUnpickableItems] = useState([]);

  useEffect(() => {
    if (orderId) { loadPickList(orderId); } else { loadPendingOrders(); }
  }, [orderId]);

  const loadPendingOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders/all?status=PENDING");
      setOrders(res.data.orders || []);
    } catch (e) { toast.error("Không thể tải đơn hàng"); } finally { setLoading(false); }
  };

  const loadPickList = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/warehouse/pick-list/${id}`);
      setSelectedOrder({ _id: res.data.orderId, orderNumber: res.data.orderNumber });

      const rawPickList = Array.isArray(res.data.pickList) ? res.data.pickList : [];
      const pickable = rawPickList
        .map((item) => ({
          ...item,
          locations: Array.isArray(item?.locations) ? item.locations : [],
        }))
        .filter((item) => item.locations.length > 0);

      const unpickable = rawPickList.filter((item) => !Array.isArray(item?.locations) || item.locations.length === 0);

      setPickList(pickable);
      setUnpickableItems(unpickable);
      setCurrentItemIndex(0);
      setCurrentLocationIndex(0);

      if (pickable.length === 0) {
        setStep(3);
        toast.error("Không có vị trí kho khả dụng để lấy hàng cho đơn này");
      } else {
        setStep(2);
      }
    } catch (e) { toast.error("Không thể tải pick list"); } finally { setLoading(false); }
  };

  const handlePickItem = async () => {
    const item = pickList[currentItemIndex];
    const loc = item?.locations?.[currentLocationIndex];

    if (!item || !loc) {
      toast.error("Không tìm thấy thông tin vị trí lấy hàng");
      return;
    }
    try {
      setLoading(true);
      await api.post("/warehouse/pick", { orderId: selectedOrder._id, sku: item.sku, locationCode: loc.locationCode, quantity: Number(loc.pickQty || loc.quantity || 0) });
      toast.success(`Đã lấy ${Number(loc.pickQty || loc.quantity || 0)} ${item.productName}`);
      if (currentLocationIndex < item.locations.length - 1) { setCurrentLocationIndex(currentLocationIndex + 1); }
      else if (currentItemIndex < pickList.length - 1) { setCurrentItemIndex(currentItemIndex + 1); setCurrentLocationIndex(0); }
      else { setStep(3); }
    } catch (e) { toast.error(e.response?.data?.message || "Lỗi khi lấy hàng"); } finally { setLoading(false); }
  };

  if (step === 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader><CardTitle className="flex items-center"><Package className="w-6 h-6 mr-2" />Chọn Đơn Hàng Cần Xuất Kho</CardTitle></CardHeader>
          <CardContent>
            {loading ? (<div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" /><p className="mt-4 text-gray-600">Đang tải...</p></div>
            ) : orders.length === 0 ? (<p className="text-center text-gray-500 py-12">Không có đơn hàng nào cần xuất kho</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order._id} onClick={() => loadPickList(order._id)} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Đơn hàng: {order.orderNumber}</p>
                        <p className="text-sm text-gray-600">Khách: {order.shippingAddress?.fullName || "N/A"}</p>
                        <p className="text-xs text-gray-500 mt-1">{order.items?.length || 0} sản phẩm</p>
                      </div>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2 && pickList.length > 0) {
    const item = pickList[currentItemIndex];
    const loc = item?.locations?.[currentLocationIndex];

    if (!item || !loc) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Không thể xác định vị trí lấy hàng cho mục hiện tại.</p>
              <Button onClick={() => { setCurrentItemIndex(0); setCurrentLocationIndex(0); }}>Tải lại bước lấy hàng</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const progress = Math.round(((currentItemIndex + (currentLocationIndex + 1) / item.locations.length) / pickList.length) * 100);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Đơn: {selectedOrder.orderNumber}</span><Badge>{progress}%</Badge></div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          </CardContent></Card>

          <Card>
            <CardHeader><CardTitle><Package className="w-5 h-5 mr-2 inline" />{item.productName}</CardTitle><p className="text-sm text-gray-600">SKU: {item.sku}</p></CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">Số lượng cần lấy</p>
                <p className="text-5xl font-bold text-blue-600">{Number(loc.pickQty || loc.quantity || 0)}</p>
              </div>

              <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
                <div className="flex items-center mb-2"><MapPin className="w-5 h-5 text-green-600 mr-2" /><span className="text-lg font-semibold">Vị trí lấy hàng</span></div>
                <p className="text-3xl font-bold text-green-600">{loc.locationCode}</p>
                <p className="text-sm text-gray-700 mt-1">{loc.zoneName}</p>
                <div className="bg-white p-4 rounded-lg mt-4">
                  <div className="flex items-center mb-2"><Navigation className="w-4 h-4 text-blue-600 mr-2" /><span className="font-medium text-sm">Hướng dẫn:</span></div>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Đi đến {loc.zoneName}</li><li>Tìm Dãy {loc.aisle}</li><li>Tầng {loc.shelf}</li><li>Ô {loc.bin}</li>
                  </ol>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { if (currentLocationIndex > 0) setCurrentLocationIndex(currentLocationIndex - 1); else if (currentItemIndex > 0) { setCurrentItemIndex(currentItemIndex - 1); setCurrentLocationIndex(pickList[currentItemIndex - 1].locations.length - 1); } else setStep(1); }} className="flex-1">Quay lại</Button>
                <Button onClick={handlePickItem} disabled={loading} className="flex-1">{loading ? "Đang xử lý..." : "Đã lấy hàng ✓"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const isFullSuccess = unpickableItems.length === 0;
    const isPartial = pickList.length > 0 && unpickableItems.length > 0;
    const isFailed = pickList.length === 0;

    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className={`flex items-center ${isFailed ? "text-red-600" : isPartial ? "text-yellow-600" : "text-green-600"}`}>
              {isFailed ? <AlertTriangle className="w-6 h-6 mr-2" /> : <CheckCircle className="w-6 h-6 mr-2" />}
              {isFailed ? "Không Thể Lấy Hàng" : isPartial ? "Hoàn Tất Có Cảnh Báo" : "Đã Lấy Đủ Hàng"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              {isFailed ? (
                <AlertTriangle className="w-24 h-24 text-red-500 mx-auto mb-4" />
              ) : isPartial ? (
                <AlertTriangle className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
              ) : (
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
              )}
              <h3 className="text-2xl font-bold mb-2">
                {isFailed ? "Thiếu vị trí kho!" : "Hoàn tất!"}
              </h3>
              <p className="text-gray-600">
                {isFailed
                  ? `Đơn hàng ${selectedOrder.orderNumber} không có vị trí lấy hàng khả dụng.`
                  : `Đã xử lý xong yêu cầu lấy hàng cho đơn ${selectedOrder.orderNumber}`}
              </p>
            </div>
            <div className="space-y-2">
              {pickList.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">✓ {item.productName || "Sản phẩm không tên"}</p>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  </div>
                  <Badge variant="outline">{item.requiredQty} chiếc</Badge>
                </div>
              ))}
              {unpickableItems.map((item, i) => (
                <div key={`u-${i}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-700">⚠ {item.productName || "Sản phẩm không tên"}</p>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  </div>
                  <Badge variant="destructive">Thiếu vị trí kho</Badge>
                </div>
              ))}
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" disabled={isFailed}>
                <Printer className="w-4 h-4 mr-2" />
                In phiếu xuất
              </Button>
              <Button onClick={() => navigate("/warehouse-staff")} className="flex-1">
                Hoàn tất
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default PickOrdersPage;
