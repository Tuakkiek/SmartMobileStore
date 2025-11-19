// ============================================
// FILE: src/pages/customer/CheckoutPage.jsx
// COMPLETE: Checkout with promotion code, accurate calculation & UX
// FIXED: Chỉ thanh toán sản phẩm được chọn (selectedForCheckout)
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Loading } from "@/components/shared/Loading";
import { useCartStore } from "@/store/cartStore";
import { orderAPI, promotionAPI, userAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Plus, MapPin, ChevronRight } from "lucide-react";
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

  useEffect(() => {
    if (user?.addresses?.length > 0) {
      const defaultAddr = user.addresses.find((a) => a.isDefault);
      setSelectedAddressId(defaultAddr?._id || user.addresses[0]._id);
    }
  }, [user]);

  // === LỌC SẢN PHẨM ĐƯỢC CHỌN ===
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

  // === TÍNH SUBTOTAL CHỈ TỪ SẢN PHẨM ĐƯỢC CHỌN ===
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // === PHÍ VẬN CHUYỂN ===
  const shippingFee = subtotal >= 5000000 ? 0 : 50000;

  // === TỔNG CUỐI ===
  const finalTotal =
    subtotal + shippingFee - (appliedPromotion?.discountAmount || 0);

  // === KIỂM TRA: NẾU KHÔNG CÓ SẢN PHẨM ĐƯỢC CHỌN → QUAY LẠI GIỎ HÀNG ===
  useEffect(() => {
    if (cart && cart.items?.length > 0 && checkoutItems.length === 0) {
      // toast.error("Vui lòng chọn ít nhất một sản phẩm để thanh toán");
      navigate("/cart");
    }
  }, []); // Chỉ chạy khi mount

  const handleChange = (e) => {
    setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckboxChange = (e) => {
    setNewAddress({
      ...newAddress,
      [e.target.id]: e.target.checked,
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
        totalAmount: subtotal, // Dùng subtotal đã lọc
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

  // === XÓA MÃ KHUYẾN MÃI ===
  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    setPromotionError("");
    toast.info("Đã xóa mã giảm giá");
  };

  // Handle add or edit address
  const handleSubmitAddress = async (formData, addressId) => {
    setIsSubmittingAddress(true);
    try {
      if (addressId) {
        // EDIT
        await userAPI.updateAddress(addressId, formData);
        toast.success("Cập nhật địa chỉ thành công");
      } else {
        // ADD
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

  const getFullAddress = (address) => {
    return [address.detailAddress, address.ward, address.province]
      .filter((part) => part && part.trim() !== "")
      .join(", ");
  };

  // Xử lý đặt hàng
  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!selectedAddressId) {
      setError("Vui lòng chọn địa chỉ nhận hàng");
      setIsLoading(false);
      return;
    }

    if (!selectedAddress) {
      setError("Địa chỉ không hợp lệ");
      setIsLoading(false);
      return;
    }

    if (checkoutItems.length === 0) {
      setError("Không có sản phẩm nào để thanh toán");
      setIsLoading(false);
      return;
    }

    try {
      const orderData = {
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phoneNumber: selectedAddress.phoneNumber,
          province: selectedAddress.province,
          // district: selectedAddress.ward || selectedAddress.province,
          // commune: selectedAddress.ward || "",
          ward: selectedAddress.ward,
          detailAddress: selectedAddress.detailAddress,
        },
        paymentMethod: formData.paymentMethod,
        note: formData.note,
        promotionCode: appliedPromotion?.code || undefined,
        items: checkoutItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          productType: item.productType,
        })),
      };

      const response = await orderAPI.create(orderData);
      toast.success("Đặt hàng thành công!");

      // XÓA DANH SÁCH ĐÃ CHỌN SAU KHI ĐẶT HÀNG
      setSelectedForCheckout([]);

      navigate(`/orders/${response.data.data.order._id}`);
    } catch (error) {
      setError(error.response?.data?.message || "Đặt hàng thất bại");
      toast.error("Đặt hàng thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // === TRƯỜNG HỢP GIỎ HÀNG TRỐNG ===
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
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Địa chỉ nhận hàng */}
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

            {/* 2. Ghi chú (optional) */}
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

            {/* 3. Phương thức thanh toán */}
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

          {/* Right sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>
                  Đơn hàng ({checkoutItems.length} sản phẩm)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {checkoutItems.length > 0 ? (
                    checkoutItems.map((item) => (
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
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Không có sản phẩm nào được chọn
                    </p>
                  )}
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

                {/* Total Calculation */}
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
                  disabled={
                    isLoading || checkoutItems.length === 0 || finalTotal <= 0
                  }
                >
                  {isLoading ? "Đang xử lý..." : "Đặt hàng"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Dialog for selecting address */}
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
                        <Badge variant="secondary" className="text-xs">
                          Mặc định
                        </Badge>
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
