// ============================================
// FILE: src/pages/customer/CheckoutPage.jsx
// COMPLETE: Checkout with promotion code, accurate calculation & UX
// ============================================

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Loading } from "@/components/shared/Loading";
import { useCartStore } from "@/store/cartStore";
import { orderAPI, promotionAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, getCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    province: "",
    district: "",
    commune: "",
    detailAddress: "",
    paymentMethod: "COD",
    note: "",
  });

  // Promotion states
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [promotionError, setPromotionError] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  useEffect(() => {
    getCart();
  }, [getCart]);

  // Tính toán subtotal từ PRICE, không trừ discount
  const subtotal =
    cart?.items?.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0) || 0;

  // Phí vận chuyển
  const shippingFee = subtotal >= 5000000 ? 0 : 50000;

  // Tổng tiền sau khi áp dụng khuyến mãi
  const finalTotal =
    subtotal + shippingFee - (appliedPromotion?.discountAmount || 0);

  const handleChange = (e) => {
    setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Áp dụng mã khuyến mãi
  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) {
      setPromotionError("Vui lòng nhập mã giảm giá");
      return;
    }

    setIsApplyingPromo(true);
    setPromotionError("");

    try {
      const response = await promotionAPI.apply({
        code: promotionCode,
        totalAmount: subtotal,
      });

      setAppliedPromotion(response.data.data);
      toast.success("Áp dụng mã thành công!");
    } catch (error) {
      setPromotionError(error.response?.data?.message || "Mã không hợp lệ");
      toast.error("Mã giảm giá không hợp lệ");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Xóa mã khuyến mãi
  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    setPromotionError("");
    toast.info("Đã xóa mã giảm giá");
  };

  // Xử lý đặt hàng
  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation cơ bản
    const requiredFields = [
      "fullName",
      "phoneNumber",
      "province",
      "district",
      "commune",
      "detailAddress",
    ];
    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        setError("Vui lòng điền đầy đủ thông tin giao hàng");
        setIsLoading(false);
        return;
      }
    }

    try {
      const orderData = {
        shippingAddress: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          province: formData.province,
          district: formData.district,
          commune: formData.commune,
          detailAddress: formData.detailAddress,
        },
        paymentMethod: formData.paymentMethod,
        note: formData.note,
        promotionCode: appliedPromotion?.code || undefined, // GỬI MÃ NẾU CÓ
        items: cart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        productType: item.productType,
      })),
    };

      const response = await orderAPI.create(orderData);
      toast.success("Đặt hàng thành công!");
      navigate(`/orders/${response.data.data.order._id}`);
    } catch (error) {
      setError(error.response?.data?.message || "Đặt hàng thất bại");
      toast.error("Đặt hàng thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  if (!cart || cart.items?.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Giỏ hàng trống</p>
        <Button onClick={() => navigate("/products")}>Tiếp tục mua sắm</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>

      <form onSubmit={handleCheckout}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin giao hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <ErrorMessage message={error} />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Họ và tên *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Số điện thoại *</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Tỉnh/Thành phố *</Label>
                    <Input
                      id="province"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Quận/Huyện *</Label>
                    <Input
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commune">Phường/Xã *</Label>
                    <Input
                      id="commune"
                      name="commune"
                      value={formData.commune}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detailAddress">Địa chỉ cụ thể *</Label>
                  <Input
                    id="detailAddress"
                    name="detailAddress"
                    placeholder="Số nhà, tên đường..."
                    value={formData.detailAddress}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Ghi chú</Label>
                  <textarea
                    id="note"
                    name="note"
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none"
                    placeholder="Ghi chú cho đơn hàng (ví dụ: giao giờ hành chính)..."
                    value={formData.note}
                    onChange={handleChange}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-muted transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={formData.paymentMethod === "COD"}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <p className="font-medium">
                      Thanh toán khi nhận hàng (COD)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Thanh toán bằng tiền mặt khi nhận hàng
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-muted transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANK_TRANSFER"
                    checked={formData.paymentMethod === "BANK_TRANSFER"}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <p className="font-medium">Chuyển khoản ngân hàng</p>
                    <p className="text-sm text-muted-foreground">
                      Chuyển khoản trước khi nhận hàng
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex gap-3 items-center"
                    >
                      <img
                        src={item.images?.[0] || "/placeholder.png"}
                        alt={item.productName}
                        className="w-14 h-14 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            item.variantColor,
                            item.variantStorage,
                            item.variantConnectivity,
                            item.variantName,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SL: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Promotion Code */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Mã giảm giá
                  </Label>
                  {!appliedPromotion ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập mã giảm giá"
                          value={promotionCode}
                          onChange={(e) => {
                            setPromotionCode(e.target.value.toUpperCase());
                            setPromotionError("");
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleApplyPromotion()
                          }
                          disabled={isApplyingPromo}
                          className="uppercase"
                        />
                        <Button
                          onClick={handleApplyPromotion}
                          disabled={isApplyingPromo || !promotionCode.trim()}
                          variant="outline"
                          className="whitespace-nowrap"
                        >
                          {isApplyingPromo ? "Đang áp dụng..." : "Áp dụng"}
                        </Button>
                      </div>
                      {promotionError && (
                        <p className="text-sm text-red-600 animate-fade-in">
                          {promotionError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
                      <div>
                        <p className="text-sm font-semibold text-green-700">
                          Mã: {appliedPromotion.code}
                        </p>
                        <p className="text-sm text-green-600">
                          Giảm: {formatPrice(appliedPromotion.discountAmount)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePromotion}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Xóa
                      </Button>
                    </div>
                  )}
                </div>

                {/* Update Total Calculation */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tạm tính:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí vận chuyển:</span>
                    <span>
                      {shippingFee === 0
                        ? "Miễn phí"
                        : formatPrice(shippingFee)}
                    </span>
                  </div>
                  {appliedPromotion && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Giảm giá:</span>
                      <span>
                        -{formatPrice(appliedPromotion.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t font-bold text-lg">
                    <span>Tổng cộng:</span>
                    <span className="text-red-600">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || finalTotal <= 0}
                >
                  {isLoading ? "Đang xử lý..." : "Đặt hàng"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
