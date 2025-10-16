// ============================================
// FILE: src/pages/customer/CartPage.jsx
// ============================================
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, isLoading, getCart, updateCartItem, removeFromCart, getTotal, error } = useCartStore();

  useEffect(() => {
    getCart();
  }, []);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    await updateCartItem(productId, newQuantity);
  };

  const handleRemove = async (productId) => {
    await removeFromCart(productId);
  };

  if (isLoading && !cart) {
    return <Loading />;
  }

  // Check for error state from the cart store
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lỗi</h3>
            <p className="text-muted-foreground mb-6">
              Không tìm thấy dữ liệu sản phẩm
            </p>
            <Button onClick={() => navigate("/products")}>
              Tiếp tục mua sắm
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = cart?.items || [];
  const total = getTotal();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Giỏ hàng của bạn</h1>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Giỏ hàng trống</h3>
            <p className="text-muted-foreground mb-6">
              Bạn chưa có sản phẩm nào trong giỏ hàng
            </p>
            <Button onClick={() => navigate("/products")}>
              Tiếp tục mua sắm
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              // Check if productId exists, otherwise show error message for that item
              !item.productId ? (
                <Card key={item.productId?._id || Math.random()}>
                  <CardContent className="p-4">
                    <p className="text-green-600">Sản phẩm đã ngừng kinh doanh</p>
</CardContent>
                </Card>
              ) : (
                <Card key={item.productId._id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.productId?.images?.[0] || "/placeholder.png"}
                        alt={item.productId?.name}
                        className="w-24 h-24 object-cover rounded-md"
                      />

                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                          {item.productId?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatPrice(item.price)}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.productId._id,
                                  item.quantity + 1
                                )
                              }
                              disabled={item.quantity >= item.productId?.quantity}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-semibold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(item.productId._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-semibold">Tóm tắt đơn hàng</h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
<span className="text-muted-foreground">Phí vận chuyển</span>
                    <span className="text-green-600">Miễn phí</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Tổng cộng</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate("/checkout")}
                >
                  Tiến hành thanh toán
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/products")}
                >
                  Tiếp tục mua sắm
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;