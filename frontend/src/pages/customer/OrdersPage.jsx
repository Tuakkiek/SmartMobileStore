// ============================================
// FILE: src/pages/customer/OrdersPage.jsx
// FIXED: Hiển thị đúng ảnh & thông tin biến thể như CheckoutPage
// ============================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { Package, Eye } from "lucide-react";
import { orderAPI } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const response = await orderAPI.getMyOrders(params);
      setOrders(response.data.data.orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Đơn hàng của tôi</h1>

        <select
          className="px-4 py-2 border rounded-md"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="SHIPPING">Đang giao</option>
          <option value="DELIVERED">Đã giao</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Chưa có đơn hàng</h3>
            <p className="text-muted-foreground mb-6">
              Bạn chưa có đơn hàng nào
            </p>
            <Button onClick={() => navigate("/products")}>Mua sắm ngay</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-lg mb-1">
                      Đơn hàng #{order.orderNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  {order.items.slice(0, 2).map((item, idx) => {
                    // DÙNG DỮ LIỆU ĐÃ LƯU TRONG createOrder
                    const image = item.images?.[0] || "/placeholder.png";
                    const variantLabel = [
                      item.variantColor,
                      item.variantStorage || item.variantName,
                      item.variantConnectivity,
                    ].filter(Boolean).join(" • ");

                    return (
                      <div
                        key={`${order._id}-${idx}`}
                        className="flex gap-3"
                      >
                        <img
                          src={image}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          {variantLabel && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {variantLabel}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            SL: {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {order.items.length > 2 && (
                    <p className="text-sm text-muted-foreground">
                      Và {order.items.length - 2} sản phẩm khác...
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Tổng tiền:{" "}
                    </span>
                    <span className="text-lg font-semibold text-primary">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/orders/${order._id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Xem chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;