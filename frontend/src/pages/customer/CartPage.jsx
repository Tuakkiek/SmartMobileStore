// ============================================
// FILE: src/pages/customer/CartPage.jsx
// FIXED: Auto-select khi có parameter "select" – KHÔNG CÒN VÒNG LẶP
// UPDATED: Dùng shadcn/ui Checkbox + cn() → MÀU ĐỎ KHI CHỌN
// ============================================

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loading } from "@/components/shared/Loading";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, cn } from "@/lib/utils"; // ← ĐÃ CÓ cn()
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox"; // ← DÙNG CHECKBOX CHUẨN
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Đọc parameter "select" từ URL
  const searchParams = new URLSearchParams(location.search);
  const autoSelectVariantId = searchParams.get("select");

  const {
    cart,
    isLoading,
    getCart,
    updateCartItem,
    removeFromCart,
    addToCart,
    setSelectedForCheckout,
  } = useCartStore();

  const [selectedItems, setSelectedItems] = useState([]); // Mảng variantId
  const [editingItem, setEditingItem] = useState(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [availableVariants, setAvailableVariants] = useState([]);

  // Dùng ref để tránh auto-select lại khi refresh hoặc re-render
  const hasAutoSelected = useRef(false);

  // Load giỏ hàng
  useEffect(() => {
    getCart();
  }, [getCart]);

  // Reset flag khi URL thay đổi (có param mới)
  useEffect(() => {
    if (autoSelectVariantId) {
      hasAutoSelected.current = false;
    }
  }, [autoSelectVariantId]);

  // TỰ ĐỘNG CHỌN SẢN PHẨM KHI CÓ PARAMETER "select"
  useEffect(() => {
    if (hasAutoSelected.current) return;
    if (!autoSelectVariantId || !cart?.items || cart.items.length === 0) return;

    const targetItem = cart.items.find(
      (item) => item.variantId === autoSelectVariantId
    );

    if (targetItem && !selectedItems.includes(autoSelectVariantId)) {
      console.log("Auto-selecting item:", autoSelectVariantId);
      setSelectedItems([autoSelectVariantId]);
      navigate("/cart", { replace: true });
      hasAutoSelected.current = true;
    }
  }, [autoSelectVariantId, cart?.items, navigate]);

  // Scroll lên đầu
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Tính tổng tiền
  const selectedTotal = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items
      .filter((item) => selectedItems.includes(item.variantId))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart?.items, selectedItems]);

  // Chọn/tắt tất cả
  const handleSelectAll = () => {
    if (!cart?.items) return;
    if (selectedItems.length === cart.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.items.map((item) => item.variantId));
    }
  };

  // Chọn/tắt một sản phẩm
  const handleSelectItem = (variantId) => {
    setSelectedItems((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  // Xóa nhiều sản phẩm
  const handleBulkRemove = async () => {
    if (selectedItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để xóa");
      return;
    }

    if (!window.confirm(`Xóa ${selectedItems.length} sản phẩm đã chọn?`))
      return;

    try {
      for (const variantId of selectedItems) {
        await removeFromCart(variantId);
      }
      await getCart();
      setSelectedItems([]);
      toast.success("Đã xóa các sản phẩm đã chọn");
    } catch (error) {
      toast.error("Xóa thất bại");
    }
  };

  // Cập nhật số lượng
  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(item.variantId, newQuantity);
    await getCart();
  };

  // Xóa một sản phẩm
  const handleRemove = async (item) => {
    await removeFromCart(item.variantId);
    await getCart();
    setSelectedItems((prev) => prev.filter((id) => id !== item.variantId));
  };

  // Lấy danh sách phiên bản
  const fetchAvailableVariants = async (item) => {
    try {
      const apiMap = {
        iPhone: iPhoneAPI,
        iPad: iPadAPI,
        Mac: macAPI,
        AirPods: airPodsAPI,
        AppleWatch: appleWatchAPI,
        Accessory: accessoryAPI,
      };

      const api = apiMap[item.productType];
      if (!api) {
        toast.error("Không hỗ trợ loại sản phẩm này");
        return;
      }

      const response = await api.getById(item.productId);
      const product = response.data.data.product;

      setAvailableVariants(product.variants || []);
      setEditingItem(item);
      setShowVariantDialog(true);
    } catch (error) {
      console.error("Lỗi khi tải phiên bản:", error);
      toast.error("Không thể tải thông tin sản phẩm");
    }
  };

  // Đổi phiên bản
  const handleChangeVariant = async (newVariantId) => {
    if (!editingItem) return;

    try {
      await removeFromCart(editingItem.variantId);
      await addToCart(
        newVariantId,
        editingItem.quantity,
        editingItem.productType
      );
      await getCart();

      setShowVariantDialog(false);
      setEditingItem(null);
      setAvailableVariants([]);
      toast.success("Đã thay đổi phiên bản sản phẩm");
    } catch (error) {
      console.error("Lỗi khi đổi phiên bản:", error);
      toast.error("Không thể thay đổi phiên bản");
    }
  };

  if (isLoading && !cart) {
    return <Loading />;
  }

  const items = cart?.items || [];
  const hasItems = items.length > 0;

  return (
    <div className="container mx-auto px-4">
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
        <div className="space-y-6">
          {/* HEADER: CHỌN TẤT CẢ + XÓA NHIỀU */}
          <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={hasItems && selectedItems.length === items.length}
                onCheckedChange={handleSelectAll}
                className={cn(
                  "data-[state=checked]:!bg-red-600",
                  "data-[state=checked]:!border-red-600",
                  "data-[state=checked]:text-white"
                )}
              />
              <span className="font-medium h-8 items-center flex">
                Chọn tất cả ({selectedItems.length}/{items.length})
              </span>
            </div>
            {selectedItems.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemove}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Xóa đã chọn
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* DANH SÁCH SẢN PHẨM */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const isSelected = selectedItems.includes(item.variantId);

                return (
                  <Card
                    key={item.variantId}
                    className={isSelected ? "ring-2 ring-primary" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* CHECKBOX – DÙNG SHADCN + CN */}
                        <div className="flex items-start mt-1 mt-14">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleSelectItem(item.variantId)
                            }
                            className={cn(
                              "data-[state=checked]:!bg-red-600",
                              "data-[state=checked]:!border-red-600",
                              "data-[state=checked]:text-white"
                            )}
                          />
                        </div>

                        {/* IMAGE */}
                        <img
                          src={item.images?.[0] || "/placeholder.png"}
                          alt={item.productName}
                          className="w-24 h-24 object-cover rounded-md flex-shrink-0"
                        />

                        <div className="flex-1">
                          {/* TÊN SẢN PHẨM */}
                          <h3 className="font-semibold mb-1">
                            {item.productName}
                          </h3>

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
                            {item.variantName && (
                              <span>• {item.variantName}</span>
                            )}
                          </div>

                          {/* GIÁ + KHUYẾN MÃI */}
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

                          {/* SỐ LƯỢNG + TỔNG + HÀNH ĐỘNG */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleUpdateQuantity(item, item.quantity - 1)
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
                                  handleUpdateQuantity(item, item.quantity + 1)
                                }
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                {formatPrice(item.price * item.quantity)}
                              </span>

                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchAvailableVariants(item)}
                                  className="text-xs"
                                >
                                  Đổi phiên bản
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemove(item)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* TÓM TẮT ĐƠN HÀNG */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold">Tóm tắt đơn hàng</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tạm tính ({selectedItems.length} sản phẩm)
                      </span>
                      <span>{formatPrice(selectedTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Phí vận chuyển
                      </span>
                      <span className="text-green-600">
                        {selectedTotal >= 5000000 ? "Miễn phí" : "50.000đ"}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Tổng cộng</span>
                        <span className="text-primary">
                          {formatPrice(selectedTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* NÚT THANH TOÁN */}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={selectedItems.length === 0}
                    onClick={() => {
                      if (selectedItems.length === 0) {
                        toast.error(
                          "Vui lòng chọn ít nhất một sản phẩm để thanh toán"
                        );
                        return;
                      }
                      setSelectedForCheckout(selectedItems);
                      navigate("/checkout");
                    }}
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
        </div>
      )}

      {/* DIALOG ĐỔI PHIÊN BẢN */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn phiên bản mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {availableVariants.length > 0 ? (
              availableVariants.map((variant) => (
                <div
                  key={variant._id}
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleChangeVariant(variant._id)}
                >
                  <div className="flex gap-4">
                    <img
                      src={variant.images?.[0] || "/placeholder.png"}
                      alt={variant.color}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{variant.color}</p>
                      <p className="text-sm text-muted-foreground">
                        {variant.storage || variant.variantName || "Tiêu chuẩn"}
                      </p>
                      <p className="font-semibold text-primary">
                        {formatPrice(variant.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Còn: {variant.stock} sản phẩm
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">
                Không có phiên bản nào khả dụng
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CartPage;
