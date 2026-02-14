import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, MapPin, Navigation, CheckCircle, Printer, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, orderAPI } from "@/lib/api";
import { getStatusStage, getStatusText } from "@/lib/utils";

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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [unpickableItems, setUnpickableItems] = useState([]);

  useEffect(() => {
    if (orderId) { loadPickList(orderId); } else { loadPendingOrders(); }
  }, [orderId]);

  const loadPendingOrders = async () => {
    try {
      setLoading(true);
      const [confirmedRes, pickingRes] = await Promise.all([
        orderAPI.getByStage("CONFIRMED", { limit: 200 }),
        orderAPI.getByStage("PICKING", { limit: 200 }),
      ]);

      const merged = [
        ...(confirmedRes.data.orders || []),
        ...(pickingRes.data.orders || []),
      ];

      const uniqueById = Array.from(
        new Map(merged.map((order) => [order._id, order])).values()
      );
      setOrders(uniqueById);
    } catch { toast.error("Khong the tai don hang"); } finally { setLoading(false); }
  };

  const loadPickList = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/warehouse/pick-list/${id}`);
      setSelectedOrder({
        _id: res.data.orderId,
        orderNumber: res.data.orderNumber,
        orderSource: res.data.orderSource,
        fulfillmentType: res.data.fulfillmentType,
        status: res.data.orderStatus,
        statusStage: getStatusStage(res.data.orderStatus),
      });

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
        toast.error("Khong co vi tri kho kha dung de lay hang cho don nay");
      } else {
        setStep(2);
      }
    } catch { toast.error("Khong the tai pick list"); } finally { setLoading(false); }
  };

  const getNextStatusAfterPick = () => {
    if (!selectedOrder) return null;
    const isInStoreOrder =
      selectedOrder.orderSource === "IN_STORE" ||
      selectedOrder.fulfillmentType === "IN_STORE";

    return isInStoreOrder ? "PENDING_PAYMENT" : "PICKUP_COMPLETED";
  };

  const handleFinalizePick = async () => {
    if (!selectedOrder?._id) {
      toast.error("Khong xac dinh don hang can cap nhat");
      return;
    }

    const nextStatus = getNextStatusAfterPick();
    if (!nextStatus) {
      toast.error("Khong xac dinh trang thai sau khi lay hang");
      return;
    }

    setIsFinalizing(true);
    try {
      await api.put(`/orders/${selectedOrder._id}/status`, {
        status: nextStatus,
        note:
          nextStatus === "PENDING_PAYMENT"
            ? "Kho da lay hang xong, chuyen thu ngan thanh toan"
            : "Kho da hoan tat lay hang, san sang giao shipper",
      });

      toast.success(
        nextStatus === "PENDING_PAYMENT"
          ? "Da chuyen don cho thu ngan"
          : "Da cap nhat don: Hoan tat lay hang"
      );
      navigate("/warehouse-staff");
    } catch (e) {
      toast.error(e.response?.data?.message || "Khong the cap nhat trang thai don");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handlePickItem = async () => {
    const item = pickList[currentItemIndex];
    const loc = item?.locations?.[currentLocationIndex];

    if (!item || !loc) {
      toast.error("Khong tim thay thong tin vi tri lay hang");
      return;
    }
    try {
      setLoading(true);
      await api.post("/warehouse/pick", { orderId: selectedOrder._id, sku: item.sku, locationCode: loc.locationCode, quantity: Number(loc.pickQty || loc.quantity || 0) });
      toast.success(`Đã lấy ${Number(loc.pickQty || loc.quantity || 0)} ${item.productName}`);
      if (currentLocationIndex < item.locations.length - 1) { setCurrentLocationIndex(currentLocationIndex + 1); }
      else if (currentItemIndex < pickList.length - 1) { setCurrentItemIndex(currentItemIndex + 1); setCurrentLocationIndex(0); }
      else { setStep(3); }
    } catch (e) { toast.error(e.response?.data?.message || "Loi khi lay hang"); } finally { setLoading(false); }
  };

  if (step === 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader><CardTitle className="flex items-center"><Package className="w-6 h-6 mr-2" />Chon Don Hang Can Xuat Kho</CardTitle></CardHeader>
          <CardContent>
            {loading ? (<div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" /><p className="mt-4 text-gray-600">Đang tải...</p></div>
            ) : orders.length === 0 ? (<p className="text-center text-gray-500 py-12">Khong co don hang nao can xuat kho</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order._id} onClick={() => loadPickList(order._id)} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Don hang: {order.orderNumber}</p>
                        <p className="text-sm text-gray-600">Khách: {order.shippingAddress?.fullName || "N/A"}</p>
                        <p className="text-sm text-gray-600">
                          Hình thức: {getStatusText(order.fulfillmentType || "HOME_DELIVERY")}
                        </p>
                        {order.assignedStore?.storeName && (
                          <p className="text-xs text-gray-500">
                            Cua hang xu ly: {order.assignedStore.storeName}
                          </p>
                        )}
                        {order.pickupInfo?.pickupCode && (
                          <p className="text-xs font-semibold text-blue-700">
                            Mã nhận: {order.pickupInfo.pickupCode}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{order.items?.length || 0} sản phẩm</p>
                      </div>
                      <Badge variant="outline">
                        {getStatusText(order.statusStage || getStatusStage(order.status))}
                      </Badge>
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
              <p className="text-gray-600 mb-4">Khong the xac dinh vi tri lay hang cho muc hien tai.</p>
              <Button onClick={() => { setCurrentItemIndex(0); setCurrentLocationIndex(0); }}>Tai lai buoc lay hang</Button>
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
                <p className="text-sm text-gray-600 mb-2">So luong can lay</p>
                <p className="text-5xl font-bold text-blue-600">{Number(loc.pickQty || loc.quantity || 0)}</p>
              </div>

              <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
                <div className="flex items-center mb-2"><MapPin className="w-5 h-5 text-green-600 mr-2" /><span className="text-lg font-semibold">Vi tri lay hang</span></div>
                <p className="text-3xl font-bold text-green-600">{loc.locationCode}</p>
                <p className="text-sm text-gray-700 mt-1">{loc.zoneName}</p>
                <div className="bg-white p-4 rounded-lg mt-4">
                  <div className="flex items-center mb-2"><Navigation className="w-4 h-4 text-blue-600 mr-2" /><span className="font-medium text-sm">Huong dan:</span></div>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Di den {loc.zoneName}</li><li>Tìm Dãy {loc.aisle}</li><li>Tầng {loc.shelf}</li><li>O {loc.bin}</li>
                  </ol>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { if (currentLocationIndex > 0) setCurrentLocationIndex(currentLocationIndex - 1); else if (currentItemIndex > 0) { setCurrentItemIndex(currentItemIndex - 1); setCurrentLocationIndex(pickList[currentItemIndex - 1].locations.length - 1); } else setStep(1); }} className="flex-1">Quay lại</Button>
                <Button onClick={handlePickItem} disabled={loading} className="flex-1">
                  {loading ? "Dang xu ly..." : "Da lay hang"}
                </Button>
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
    const nextStatus = getNextStatusAfterPick();
    const nextStatusLabel =
      nextStatus === "PENDING_PAYMENT" ? "Cho thu ngan thanh toan" : "Da hoan tat lay hang";

    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className={`flex items-center ${isFailed ? "text-red-600" : isPartial ? "text-yellow-600" : "text-green-600"}`}>
              {isFailed ? <AlertTriangle className="w-6 h-6 mr-2" /> : <CheckCircle className="w-6 h-6 mr-2" />}
              {isFailed ? "Khong The Lay Hang" : isPartial ? "Hoan Tat Co Canh Bao" : "Da Lay Du Hang"}
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
                {isFailed ? "Thieu vi tri kho!" : "Hoan tat!"}
              </h3>
              <p className="text-gray-600">
                {isFailed
                  ? `Don hang ${selectedOrder.orderNumber} khong co vi tri lay hang kha dung.`
                  : `Da xu ly xong yeu cau lay hang cho don ${selectedOrder.orderNumber}`}
              </p>
              {!isFailed && (
                <p className="text-sm mt-2 text-blue-700 font-medium">
                  Trạng thái tiếp theo: {nextStatusLabel}
                </p>
              )}
              {isPartial && (
                <p className="text-sm mt-2 text-yellow-700">
                  Con san pham thieu vi tri kho, chua the chuyen sang buoc tiep theo.
                </p>
              )}
            </div>
            <div className="space-y-2">
              {pickList.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">* {item.productName || "San pham khong ten"}</p>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  </div>
                  <Badge variant="outline">{item.requiredQty} chiếc</Badge>
                </div>
              ))}
              {unpickableItems.map((item, i) => (
                <div key={`u-${i}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-700">! {item.productName || "San pham khong ten"}</p>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  </div>
                  <Badge variant="destructive">Thieu vi tri kho</Badge>
                </div>
              ))}
            </div>
            <div className="flex space-x-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" disabled={!isFullSuccess}>
                <Printer className="w-4 h-4 mr-2" />
                In phiếu xuất
              </Button>
              {isFullSuccess ? (
                <Button onClick={handleFinalizePick} className="flex-1" disabled={isFinalizing}>
                  {isFinalizing ? "Đang cập nhật..." : "Xac nhan hoan tat"}
                </Button>
              ) : (
                <Button onClick={() => navigate("/warehouse-staff")} className="flex-1">
                  Quay về Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default PickOrdersPage;




