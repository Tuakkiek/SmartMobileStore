// ============================================
// FILE: src/pages/customer/CheckoutPage.jsx
// ĐÃ SỬA: Lưu giá final sau khi áp mã giảm giá vào DB
// ============================================

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCartStore } from "@/store/cartStore";
import { orderAPI, promotionAPI, userAPI, vnpayAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Plus, MapPin, ChevronRight, ArrowLeft } from "lucide-react";
import AddressFormDialog from "@/components/shared/AddressFormDialog";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, getCart, selectedForCheckout, setSelectedForCheckout } =
    useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, getCurrentUser } = useAuthStore();

  // Form data
  const [formData, setFormData] = useState({
    paymentMethod: "COD",
    note: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showSelectAddressDialog, setShowSelectAddressDialog] = useState(false);

  // Promotion states
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [promotionError, setPromotionError] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  useEffect(() => {
    if (user?.addresses?.length > 0) {
      const defaultAddr = user.addresses.find((a) => a.isDefault);
      setSelectedAddressId(defaultAddr?._id || user.addresses[0]._id);
    } else {
      setError("Vui lòng thêm địa chỉ nhận hàng");
    }
  }, [user]);

  // Lọc sản phẩm được chọn
  const checkoutItems = useMemo(() => {
    if (
      !cart?.items ||
      !selectedForCheckout ||
      selectedForCheckout.length === 0
    ) {
      return [];
    }
    return cart.items.filter((item) =>
      selectedForCheckout.includes(item.variantId)
    );
  }, [cart?.items, selectedForCheckout]);

  // Subtotal gốc (trước giảm giá)
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Phí vận chuyển
  const shippingFee = subtotal >= 5000000 ? 0 : 50000;

  // Tổng cuối cùng
  const finalTotal =
    subtotal + shippingFee - (appliedPromotion?.discountAmount || 0);

  // TÍNH GIÁ FINAL CHO TỪNG SẢN PHẨM SAU KHI ÁP DỤNG KHUYẾN MÃI
  const checkoutItemsWithFinalPrice = useMemo(() => {
    if (checkoutItems.length === 0) return [];

    const discountAmount = appliedPromotion?.discountAmount || 0;

    if (discountAmount === 0) {
      return checkoutItems.map((item) => ({
        ...item,
        originalPrice: item.price,
        finalPrice: item.price,
      }));
    }

    const totalForDiscount = subtotal;
    let remainingDiscount = discountAmount;

    const items = checkoutItems.map((item, index) => {
      const itemSubtotal = item.price * item.quantity;
      const ratio = itemSubtotal / totalForDiscount;
      let itemDiscount = Math.round(ratio * discountAmount);

      // Đảm bảo không vượt quá phần giảm còn lại (tránh lỗi làm tròn)
      if (index === checkoutItems.length - 1) {
        itemDiscount = remainingDiscount;
      } else {
        remainingDiscount -= itemDiscount;
      }

      const finalPricePerUnit = Math.max(
        0,
        item.price - Math.round(itemDiscount / item.quantity)
      );

      return {
        ...item,
        originalPrice: item.price,
        finalizedPrice: finalPricePerUnit,
      };
    });

    return items;
  }, [checkoutItems, subtotal, appliedPromotion?.discountAmount]);

  // Tính lại subtotal sau khi đã giảm giá (dùng để hiển thị)
  const discountedSubtotal = checkoutItemsWithFinalPrice.reduce(
    (sum, item) =>
      sum + (item.finalizedPrice || item.originalPrice) * item.quantity,
    0
  );

  // Kiểm tra khi mount
  useEffect(() => {
    if (selectedForCheckout.length === 0) {
      toast.error("Vui lòng chọn sản phẩm để thanh toán");
      navigate("/cart");
      return;
    }
    if (!cart) getCart();
  }, []);

  // Bỏ lỗi VNPay sandbox
  useEffect(() => {
    const handler = (event) => {
      if (event.message?.includes("timer is not defined")) {
        console.warn("VNPay Sandbox bug ignored");
        event.preventDefault();
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  // ✅ THÊM: Cảnh báo khi rời trang
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRedirectingToPayment) {
        return; // Cho phép redirect đến VNPay
      }

      // Nếu đang ở trang checkout và có sản phẩm
      if (checkoutItems.length > 0 && formData.paymentMethod === "VNPAY") {
        e.preventDefault();
        e.returnValue =
          "Bạn có chắc muốn rời khỏi trang? Đơn hàng chưa được hoàn tất.";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [checkoutItems.length, isRedirectingToPayment, formData.paymentMethod]);

  const handleChange = (e) => {
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const pendingOrder = localStorage.getItem("pending_vnpay_order");
    if (pendingOrder) {
      try {
        const { orderId, orderNumber, timestamp } = JSON.parse(pendingOrder);
        const ageMinutes = (Date.now() - timestamp) / 1000 / 60;

        if (ageMinutes < 15) {
          toast.warning(
            `Đơn hàng #${orderNumber} chưa thanh toán - Sản phẩm vẫn trong giỏ`,
            {
              duration: 10000,
              action: {
                label: "Tiếp tục thanh toán",
                onClick: () => navigate(`/orders/${orderId}`),
              },
            }
          );
        } else {
          // ✅ Sau 15 phút, hủy đơn và thông báo
          toast.info("Đơn hàng VNPay đã hết hạn - Vui lòng đặt lại", {
            duration: 6000,
          });
          localStorage.removeItem("pending_vnpay_order");
        }
      } catch {}
    }
  }, [navigate]);

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

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    setPromotionError("");
    toast.info("Đã xóa mã giảm giá");
  };

  // Address handlers
  const handleSubmitAddress = async (formData, addressId) => {
    setIsSubmittingAddress(true);
    try {
      if (addressId) {
        await userAPI.updateAddress(addressId, formData);
        toast.success("Cập nhật địa chỉ thành công");
      } else {
        await userAPI.addAddress(formData);
        toast.success("Thêm địa chỉ thành công");
      }
      await getCurrentUser();
      setShowAddressDialog(false);
      setEditingAddressId(null);
    } catch (error) {
      toast.error("Thao tác thất bại");
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const openEditAddress = (address) => {
    setEditingAddressId(address._id);
    setShowSelectAddressDialog(false);
    setShowAddressDialog(true);
  };

  const selectedAddress = user?.addresses?.find(
    (a) => a._id === selectedAddressId
  );

  const getFullAddress = (address) =>
    [address.detailAddress, address.ward, address.province]
      .filter(Boolean)
      .join(", ");

  // Xử lý đặt hàng
  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (checkoutItems.length === 0) {
      setError("Không có sản phẩm nào để thanh toán");
      setIsLoading(false);
      navigate("/cart", { replace: true });
      return;
    }

    if (!selectedAddressId) {
      setError("Vui lòng chọn địa chỉ nhận hàng");
      setIsLoading(false);
      return;
    }

    try {
      const orderData = {
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phoneNumber: selectedAddress.phoneNumber,
          province: selectedAddress.province,
          ward: selectedAddress.ward,
          detailAddress: selectedAddress.detailAddress,
        },
        paymentMethod: formData.paymentMethod,
        note: formData.note,
        promotionCode: appliedPromotion?.code || null,
        items: checkoutItemsWithFinalPrice.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          productType: item.productType,
          price: item.finalizedPrice || item.originalPrice,
          originalPrice: item.originalPrice,
        })),
      };

      const response = await orderAPI.create(orderData);
      const createdOrder = response.data.data.order;

      if (formData.paymentMethod === "VNPAY") {
        setIsRedirectingToPayment(true);
        try {
          const vnpayResponse = await vnpayAPI.createPaymentUrl({
            orderId: createdOrder._id,
            amount: createdOrder.totalAmount,
            orderDescription: `Thanh toan don hang ${createdOrder.orderNumber}`,
            language: "vn",
          });

          if (vnpayResponse.data?.success) {
            // ✅ THÊM: Lưu thông tin chi tiết hơn
            localStorage.setItem(
              "pending_vnpay_order",
              JSON.stringify({
                orderId: createdOrder._id,
                orderNumber: createdOrder.orderNumber, // ← THÊM
                selectedItems: selectedForCheckout,
                totalAmount: createdOrder.totalAmount, // ← THÊM
                timestamp: Date.now(),
              })
            );

            // ✅ QUAN TRỌNG: Không xóa selectedForCheckout ở đây
            // Chỉ xóa sau khi thanh toán thành công

            window.location.href = vnpayResponse.data.data.paymentUrl;
          } else {
            throw new Error("Không thể tạo link thanh toán");
          }
        } catch (err) {
          setIsRedirectingToPayment(false);
          // ✅ HỦY ĐƠN HÀNG NẾU TẠO LINK THẤT BẠI
          await orderAPI.cancel(createdOrder._id, {
            reason: "Không thể tạo link thanh toán VNPay",
          });
          toast.error("Lỗi khi tạo link thanh toán VNPay");
        }
      } else {
        // ✅ COD/BANK_TRANSFER - Backend đã xóa giỏ, chỉ cần refresh
        setSelectedForCheckout([]);

        // Refresh cart từ server (backend đã xóa rồi)
        await getCart();

        console.log(
          `✅ Đơn hàng ${createdOrder.orderNumber} đã tạo thành công`
        );

        toast.success("Đặt hàng thành công!");

        setTimeout(() => {
          navigate(`/orders/${createdOrder._id}`, { replace: true });
        }, 300);
      }
    } catch (error) {
      console.error("Order error:", error);
      setError(error.response?.data?.message || "Đặt hàng thất bại");
      toast.error("Đặt hàng thất bại");
    } finally {
      if (formData.paymentMethod !== "VNPAY") {
        setIsLoading(false);
      }
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
      <button
        onClick={() => navigate("/cart")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Quay lại giỏ hàng</span>
      </button>
      <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>

      <form onSubmit={handleCheckout}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Địa chỉ nhận hàng */}
            <Card>
              <CardHeader>
                <CardTitle>Địa chỉ nhận hàng</CardTitle>
              </CardHeader>
              <CardContent>
                {user?.addresses?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Bạn chưa có địa chỉ nào
                    </p>
                    <Button onClick={() => setShowAddressDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm địa chỉ mới
                    </Button>
                  </div>
                ) : selectedAddress ? (
                  <div
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition"
                    onClick={() => setShowSelectAddressDialog(true)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-500 mt-1" />
                      <div>
                        <p className="font-medium">
                          {selectedAddress.fullName} (+84){" "}
                          {selectedAddress.phoneNumber.replace(/^0/, "")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getFullAddress(selectedAddress)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Ghi chú */}
            <Card>
              <CardHeader>
                <CardTitle>Ghi chú đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  name="note"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none"
                  placeholder="Ghi chú cho đơn hàng..."
                  value={formData.note}
                  onChange={handleChange}
                />
              </CardContent>
            </Card>

            {/* Phương thức thanh toán */}
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
                    value="VNPAY"
                    checked={formData.paymentMethod === "VNPAY"}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <p className="font-medium">Thanh toán VNPay</p>
                    <p className="text-sm text-muted-foreground">
                      Thanh toán qua ATM, Visa, MasterCard, JCB
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
                <CardTitle>
                  Đơn hàng ({checkoutItems.length} sản phẩm)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {checkoutItemsWithFinalPrice.map((item) => (
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
                      <div className="text-right">
                        {appliedPromotion ? (
                          <>
                            <p className="text-xs line-through text-muted-foreground">
                              {formatPrice(item.originalPrice * item.quantity)}
                            </p>
                            <p className="text-sm font-semibold text-red-600">
                              {formatPrice(item.finalizedPrice * item.quantity)}
                            </p>
                          </>
                        ) : (
                          <span className="text-sm font-medium">
                            {formatPrice(item.originalPrice * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mã giảm giá */}
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
                        <p className="text-sm text-red-600">{promotionError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
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

                {/* Tổng tiền */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tạm tính:</span>
                    <span>{formatPrice(discountedSubtotal)}</span>
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
                  disabled={
                    isLoading ||
                    checkoutItems.length === 0 ||
                    finalTotal <= 0 ||
                    isRedirectingToPayment
                  }
                >
                  {isRedirectingToPayment
                    ? "Đang chuyển đến cổng thanh toán..."
                    : isLoading
                    ? "Đang xử lý..."
                    : "Đặt hàng"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Dialog chọn địa chỉ */}
      <Dialog
        open={showSelectAddressDialog}
        onOpenChange={setShowSelectAddressDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn địa chỉ nhận hàng</DialogTitle>
            <DialogDescription>
              Chọn hoặc thêm địa chỉ để nhận hàng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {user?.addresses?.map((address) => (
              <div
                key={address._id}
                className="flex items-center justify-between border-b pb-2 last:border-b-0"
              >
                <label className="flex items-center gap-4 flex-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={selectedAddressId === address._id}
                    onChange={() => {
                      setSelectedAddressId(address._id);
                      setShowSelectAddressDialog(false);
                    }}
                    className="w-5 h-5 text-red-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {address.fullName} (+84){" "}
                        {address.phoneNumber.replace(/^0/, "")}
                      </span>
                      {address.isDefault && (
                        <Badge variant="secondary">Mặc định</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getFullAddress(address)}
                    </p>
                  </div>
                </label>
                <Button
                  variant="link"
                  className="text-blue-600"
                  onClick={() => openEditAddress(address)}
                >
                  Sửa
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full text-red-500"
              onClick={() => {
                setEditingAddressId(null);
                setShowSelectAddressDialog(false);
                setShowAddressDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm Địa Chỉ Mới
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddressFormDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        onSubmit={handleSubmitAddress}
        editingAddress={
          editingAddressId
            ? user?.addresses?.find((a) => a._id === editingAddressId)
            : null
        }
        isLoading={isSubmittingAddress}
      />
    </div>
  );
};

export default CheckoutPage;
