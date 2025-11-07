// ============================================
// FILE: src/pages/customer/CartPage.jsx
// COMPLETE: Hiển thị đầy đủ variant info + discount badge
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
  const { cart, isLoading, getCart, updateCartItem, removeFromCart, getTotal } =
    useCartStore();

  useEffect(() => {
    getCart();
  }, [getCart]);

  const handleUpdateQuantity = async (variantId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(variantId, newQuantity);
  };

  const handleRemove = async (variantId) => {
    await removeFromCart(variantId);
  };

  if (isLoading && !cart) {
    return <Loading />;
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
              <Card key={item.variantId}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <img
                      src={item.images?.[0] || "/placeholder.png"}
                      alt={item.productName}
                      className="w-24 h-24 object-cover rounded-md"
                    />

                    <div className="flex-1">
                      {/* Product Name */}
                      <h3 className="font-semibold mb-1">{item.productName}</h3>

                      {/* VARIANT INFO */}
                      <div className="flex gap-3 text-sm text-muted-foreground mb-2">
                        {item.variantColor && (
                          <span>Màu: {item.variantColor}</span>
                        )}
                        {item.variantStorage && (
                          <span>• {item.variantStorage}</span>
                        )}
                        {item.variantConnectivity && (
                          <span>• {item.variantConnectivity}</span>
                        )}
                        {item.variantName && <span>• {item.variantName}</span>}
                      </div>

                      {/* PRICE WITH DISCOUNT BADGE */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-semibold text-red-600">
                          {formatPrice(item.price)}
                        </span>
                        {item.originalPrice > item.price && (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(item.originalPrice)}
                            </span>
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">
                              -
                              {Math.round(
                                ((item.originalPrice - item.price) /
                                  item.originalPrice) *
                                  100
                              )}
                              %
                            </span>
                          </>
                        )}
                      </div>

                      {/* Quantity Controls + Total + Remove */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.variantId,
                                item.quantity - 1
                              )
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-4 min-w-[40px] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.variantId,
                                item.quantity + 1
                              )
                            }
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-lg">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(item.variantId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    <span className="text-muted-foreground">
                      Phí vận chuyển
                    </span>
                    <span className="text-green-600">
                      {total >= 5000000 ? "Miễn phí" : "50.000đ"}
                    </span>
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
