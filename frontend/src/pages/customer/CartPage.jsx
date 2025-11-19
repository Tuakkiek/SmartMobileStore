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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [variantsCache, setVariantsCache] = useState({});
  const [optimisticCart, setOptimisticCart] = useState(null);
  const [loadingVariants, setLoadingVariants] = useState({});
  const [isChangingVariant, setIsChangingVariant] = useState(false);

  // Dùng ref để tránh auto-select lại khi refresh hoặc re-render
  const hasAutoSelected = useRef(false);
  const items = optimisticCart?.items || cart?.items || [];
  const hasItems = items.length > 0;

  const [itemsOrder, setItemsOrder] = useState({}); // { variantId: timestamp }

  // Sắp xếp theo thời gian thêm vào giỏ (mới nhất ở trên)
  const sortedItems = useMemo(() => {
    if (!items.length) {
      return [];
    }

    // ✅ TẠO BẢN COPY VỚI INDEX GỐC
    const itemsWithIndex = items.map((item, index) => ({
      ...item,
      originalIndex: index,
    }));

    const sorted = itemsWithIndex.sort((a, b) => {
      const timeA = itemsOrder[a.variantId] || 0;
      const timeB = itemsOrder[b.variantId] || 0;

      // Nếu timestamp khác nhau → sort theo timestamp (mới hơn trước)
      if (timeA !== timeB) {
        return timeB - timeA;
      }

      // Nếu timestamp giống nhau → giữ nguyên thứ tự gốc
      return a.originalIndex - b.originalIndex;
    });

    return sorted;
  }, [items, itemsOrder]);
  // Load giỏ hàng
  useEffect(() => {
    getCart();
  }, [getCart]);
  useEffect(() => {
    // ✅ BỎ QUA NẾU ĐANG ĐỔI VARIANT
    if (isChangingVariant) {
      return;
    }

    if (cart?.items) {
      setItemsOrder((prev) => {
        const newOrder = { ...prev };
        let hasChanges = false;

        cart.items.forEach((item) => {
          if (!newOrder[item.variantId]) {
            const newTimestamp = Date.now();
            newOrder[item.variantId] = newTimestamp;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          return newOrder;
        }

        return prev;
      });
    }
  }, [cart?.items, isChangingVariant]); // ← THÊM isChangingVariant vào deps
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
      setSelectedItems([autoSelectVariantId]);

      // ✅ Gán timestamp mới cho item vừa thêm
      setItemsOrder((prev) => ({
        ...prev,
        [autoSelectVariantId]: Date.now(),
      }));

      navigate("/cart", { replace: true });
      hasAutoSelected.current = true;
    }
  }, [autoSelectVariantId, cart?.items, navigate]);
  // Scroll lên đầu
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  // Load từ localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem("cart-items-order");
    if (savedOrder) {
      try {
        setItemsOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error("Failed to parse cart order", e);
      }
    }
  }, []);

  // Save vào localStorage
  useEffect(() => {
    if (Object.keys(itemsOrder).length > 0) {
      localStorage.setItem("cart-items-order", JSON.stringify(itemsOrder));
    }
  }, [itemsOrder]);

  // Cleanup items không còn trong cart
  useEffect(() => {
    if (cart?.items && !isChangingVariant) {
      const currentVariantIds = new Set(
        cart.items.map((item) => item.variantId)
      );

      setItemsOrder((prev) => {
        const cleaned = {};
        let hasChanges = false;

        // Giữ lại những ID còn trong cart
        Object.keys(prev).forEach((variantId) => {
          if (currentVariantIds.has(variantId)) {
            cleaned[variantId] = prev[variantId];
          } else {
            hasChanges = true;
          }
        });

        return hasChanges ? cleaned : prev;
      });
    }
  }, [cart?.items, isChangingVariant]);
  // Reset sau khi getCart() thành công
  useEffect(() => {
    if (cart) {
      setOptimisticCart(cart);
    }
  }, [cart]);

  useEffect(() => {
    if (cart?.items && Object.keys(itemsOrder).length === 0) {
      // Khởi tạo lần đầu - gán timestamp khác nhau cho mỗi item
      const initialOrder = {};
      const baseTime = Date.now();

      cart.items.forEach((item, index) => {
        // Mỗi item cách nhau 1ms để đảm bảo unique
        initialOrder[item.variantId] = baseTime - index * 1;
      });

      setItemsOrder(initialOrder);
    }
  }, [cart?.items]);

  // Tính tổng tiền
  const selectedTotal = useMemo(() => {
    if (!items) return 0;
    return items
      .filter((item) => selectedItems.includes(item.variantId))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items, selectedItems]);

  // Chọn/tắt tất cả
  const handleSelectAll = () => {
    if (!items) return;
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.variantId));
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

  // Thêm debounce để tránh gọi API liên tục
  const updateTimeoutRef = useRef(null);

  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;

    // Tìm index của item
    const currentIndex = items.findIndex((i) => i.variantId === item.variantId);

    // Optimistic update
    const updatedItems = [...items];
    updatedItems[currentIndex] = {
      ...updatedItems[currentIndex],
      quantity: newQuantity,
    };

    setOptimisticCart({
      ...cart,
      items: updatedItems,
    });

    // Debounce API call
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      try {
        await updateCartItem(item.variantId, newQuantity);
        // Không cần gọi getCart() nếu optimistic update thành công
      } catch (error) {
        toast.error("Không thể cập nhật số lượng");
        await getCart(); // Revert nếu lỗi
      }
    }, 300);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // QUAN TRỌNG: Cleanup timeout khi unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Xóa một sản phẩm
  const handleRemove = async (item) => {
    await removeFromCart(item.variantId);
    await getCart();
    setSelectedItems((prev) => prev.filter((id) => id !== item.variantId));
  };

  // Fetch and cache variants for a product
  const fetchAndCacheVariants = async (item) => {
    // Đang loading thì return cache hiện tại hoặc null
    if (loadingVariants[item.productId]) {
      return variantsCache[item.productId] || null;
    }

    if (variantsCache[item.productId]) {
      return variantsCache[item.productId];
    }

    // Đánh dấu đang loading
    setLoadingVariants((prev) => ({ ...prev, [item.productId]: true }));

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
      if (!api) return null;

      const response = await api.getById(item.productId);
      const product = response.data.data.product;
      const variants = product.variants || [];

      const storages = [
        ...new Set(
          variants.map((v) => v.storage || v.variantName).filter(Boolean)
        ),
      ];
      const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

      const cached = { variants, storages, colors };
      setVariantsCache((prev) => ({ ...prev, [item.productId]: cached }));

      return cached;
    } catch (error) {
      console.error("Error fetching variants:", error);
      return null;
    } finally {
      // Xóa loading state
      setLoadingVariants((prev) => ({ ...prev, [item.productId]: false }));
    }
  };

  // Get storage options with cache
  const getStorageOptions = (item) => {
    if (variantsCache[item.productId]) {
      return variantsCache[item.productId].storages;
    }

    // Trigger fetch in background
    fetchAndCacheVariants(item);

    // Return current value while loading
    return [item.variantStorage || item.variantName || "Standard"];
  };

  // Get color options with cache
  const getColorOptions = (item) => {
    if (variantsCache[item.productId]) {
      return variantsCache[item.productId].colors;
    }

    // Trigger fetch in background
    fetchAndCacheVariants(item);

    // Return current value while loading
    return [item.variantColor || "Default"];
  };

  const handleQuickChangeVariant = async (item, type, newValue) => {
    // Lưu timestamp của item cũ
    const oldTimestamp = itemsOrder[item.variantId] || Date.now();

    // ✅ SET FLAG - ĐANG ĐỔI VARIANT
    setIsChangingVariant(true);

    try {
      let cached = variantsCache[item.productId];

      if (!cached) {
        cached = await fetchAndCacheVariants(item);
        if (!cached) {
          toast.error("Không thể tải thông tin sản phẩm");
          setIsChangingVariant(false);
          return;
        }
      }

      const variants = cached.variants;
      let targetVariant;

      if (type === "storage") {
        targetVariant = variants.find(
          (v) =>
            (v.storage === newValue || v.variantName === newValue) &&
            v.color === item.variantColor
        );

        if (!targetVariant) {
          targetVariant = variants.find(
            (v) => v.storage === newValue || v.variantName === newValue
          );
        }
      } else {
        targetVariant = variants.find(
          (v) =>
            v.color === newValue &&
            (v.storage === item.variantStorage ||
              v.variantName === item.variantName)
        );

        if (!targetVariant) {
          targetVariant = variants.find((v) => v.color === newValue);
        }
      }

      if (!targetVariant) {
        toast.error("Không tìm thấy phiên bản phù hợp");
        setIsChangingVariant(false);
        return;
      }

      if (targetVariant.stock === 0) {
        toast.error("Phiên bản này đã hết hàng");
        setIsChangingVariant(false);
        return;
      }

      // ✅ CẬP NHẬT itemsOrder TRƯỚC KHI GỌI API
      setItemsOrder((prev) => {
        const newOrder = { ...prev };

        // Xóa ID cũ
        delete newOrder[item.variantId];

        // Thêm ID mới với timestamp cũ
        newOrder[targetVariant._id] = oldTimestamp;

        return newOrder;
      });

      // ✅ CẬP NHẬT selectedItems TRƯỚC KHI GỌI API
      if (selectedItems.includes(item.variantId)) {
        setSelectedItems((prev) =>
          prev.map((id) => (id === item.variantId ? targetVariant._id : id))
        );
      }

      await removeFromCart(item.variantId);

      await addToCart(targetVariant._id, item.quantity, item.productType);

      await getCart();

      toast.success(
        `Đã đổi ${type === "storage" ? "dung lượng" : "màu sắc"} thành công`
      );
    } catch (error) {
      toast.error("Không thể thay đổi phiên bản");

      // ✅ NẾU LỖI - REVERT LẠI
      await getCart();
    } finally {
      // ✅ RESET FLAG SAU KHI HOÀN TẤT
      setIsChangingVariant(false);
    }
  };

  if (isLoading && !cart) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto px-4 ">
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
              {sortedItems.map((item) => {
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
                            {/* LEFT: QUANTITY + STORAGE + COLOR */}
                            <div className="flex items-center gap-2">
                              {/* Quantity Controls */}
                              <div className="flex items-center border rounded-md">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item,
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
                                      item,
                                      item.quantity + 1
                                    )
                                  }
                                  disabled={item.quantity >= item.stock}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Storage Dropdown */}
                              <Select
                                value={
                                  item.variantStorage || item.variantName || ""
                                }
                                onValueChange={(newStorage) =>
                                  handleQuickChangeVariant(
                                    item,
                                    "storage",
                                    newStorage
                                  )
                                }
                                disabled={loadingVariants[item.productId]}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Dung lượng" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getStorageOptions(item).map((storage) => (
                                    <SelectItem key={storage} value={storage}>
                                      {storage}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Color Dropdown */}
                              <Select
                                value={item.variantColor || ""}
                                onValueChange={(newColor) =>
                                  handleQuickChangeVariant(
                                    item,
                                    "color",
                                    newColor
                                  )
                                }
                                disabled={loadingVariants[item.productId]}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Màu sắc" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getColorOptions(item).map((color) => (
                                    <SelectItem key={color} value={color}>
                                      {color}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* RIGHT: TOTAL + DELETE */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                {formatPrice(item.price * item.quantity)}
                              </span>

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
    </div>
  );
};

export default CartPage;
