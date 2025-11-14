// ============================================
// FILE: frontend/src/pages/pos-staff/POSDashboard.jsx
// Trang bán hàng trực tiếp tại cửa hàng (Point of Sale)
// ============================================

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  X,
  Package,
  DollarSign,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { iPhoneAPI, iPadAPI, macAPI, airPodsAPI, appleWatchAPI, accessoryAPI } from "@/lib/api";
import axios from "axios";

const POSDashboard = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentReceived, setPaymentReceived] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("iPhone");

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      let response;

      switch (selectedCategory) {
        case "iPhone":
          response = await iPhoneAPI.getAll({ limit: 20 });
          break;
        case "iPad":
          response = await iPadAPI.getAll({ limit: 20 });
          break;
        case "Mac":
          response = await macAPI.getAll({ limit: 20 });
          break;
        case "AirPods":
          response = await airPodsAPI.getAll({ limit: 20 });
          break;
        case "AppleWatch":
          response = await appleWatchAPI.getAll({ limit: 20 });
          break;
        case "Accessory":
          response = await accessoryAPI.getAll({ limit: 20 });
          break;
        default:
          response = await iPhoneAPI.getAll({ limit: 20 });
      }

      const productData = response?.data?.data?.products || response?.data || [];
      setProducts(
        Array.isArray(productData)
          ? productData.map((p) => ({ ...p, category: selectedCategory }))
          : []
      );
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm:", error);
      toast.error("Không thể tải sản phẩm");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CART FUNCTIONS
  // ============================================
  const addToCart = (product, variant) => {
    const existingItem = cart.find((item) => item.variantId === variant._id);

    if (existingItem) {
      if (existingItem.quantity >= variant.stock) {
        toast.error("Không đủ hàng trong kho");
        return;
      }
      setCart(
        cart.map((item) =>
          item.variantId === variant._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
      toast.success("Đã tăng số lượng");
    } else {
      setCart([
        ...cart,
        {
          productId: product._id,
          variantId: variant._id,
          productType: product.category,
          productName: product.name,
          variantColor: variant.color,
          variantStorage: variant.storage || variant.variantName || "",
          price: variant.price,
          quantity: 1,
          stock: variant.stock,
          image: variant.images?.[0] || "/placeholder.png",
        },
      ]);
      toast.success("Đã thêm vào giỏ hàng");
    }
  };

  const updateQuantity = (variantId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.variantId === variantId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity > item.stock) {
              toast.error("Không đủ hàng trong kho");
              return item;
            }
            if (newQuantity < 1) {
              return null;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (variantId) => {
    setCart(cart.filter((item) => item.variantId !== variantId));
    toast.success("Đã xóa khỏi giỏ hàng");
  };

  const clearCart = () => {
    if (window.confirm("Xóa tất cả sản phẩm trong giỏ hàng?")) {
      setCart([]);
      toast.success("Đã xóa giỏ hàng");
    }
  };

  // ============================================
  // CALCULATION FUNCTIONS
  // ============================================
  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getChange = () => {
    const received = parseFloat(paymentReceived) || 0;
    return Math.max(0, received - getTotal());
  };

  // ============================================
  // CHECKOUT
  // ============================================
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    const received = parseFloat(paymentReceived);
    if (!received || received < getTotal()) {
      toast.error("Số tiền nhận không đủ");
      return;
    }

    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage
        ? JSON.parse(authStorage).state.token
        : null;

      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/pos/orders`,
        {
          items: cart.map((item) => ({
            variantId: item.variantId,
            productType: item.productType,
            quantity: item.quantity,
          })),
          customerInfo: {
            fullName: customerName || "Khách lẻ",
            phoneNumber: customerPhone || "N/A",
          },
          paymentMethod: "CASH",
          paymentReceived: received,
          storeLocation: "Apple Store Cần Thơ",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Thanh toán thành công!");

      // Print receipt
      printReceipt(response.data.data.order);

      // Reset form
      setCart([]);
      setCustomerPhone("");
      setCustomerName("");
      setPaymentReceived("");
    } catch (error) {
      console.error("Lỗi thanh toán:", error);
      toast.error(
        error.response?.data?.message || "Thanh toán thất bại"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PRINT RECEIPT
  // ============================================
  const printReceipt = (order) => {
    const printWindow = window.open("", "", "width=300,height=600");
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn #${order.posInfo.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; width: 80mm; margin: 0; padding: 10px; }
          h1 { text-align: center; font-size: 18px; margin: 10px 0; }
          .info { text-align: center; margin-bottom: 10px; font-size: 12px; }
          hr { border: 1px dashed #000; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td { padding: 5px 0; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .total { font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>APPLE STORE CẦN THƠ</h1>
        <div class="info">
          <p>Địa chỉ: Xuân Khánh, Ninh Kiều, Cần Thơ</p>
          <p>Hotline: 1900.xxxx</p>
        </div>
        <hr/>
        <p><strong>Số phiếu:</strong> ${order.posInfo.receiptNumber}</p>
        <p><strong>Ngày:</strong> ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
        <p><strong>Thu ngân:</strong> ${order.posInfo.cashierName}</p>
        <hr/>
        <table>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr>
                <td colspan="2">${item.productName}</td>
              </tr>
              <tr>
                <td>${item.quantity} x ${formatPrice(item.price)}</td>
                <td class="right bold">${formatPrice(item.total)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <hr/>
        <table class="total">
          <tr>
            <td>Tổng tiền:</td>
            <td class="right bold">${formatPrice(order.totalAmount)}</td>
          </tr>
          <tr>
            <td>Tiền khách đưa:</td>
            <td class="right">${formatPrice(order.posInfo.paymentReceived)}</td>
          </tr>
          <tr>
            <td>Tiền thối lại:</td>
            <td class="right bold">${formatPrice(order.posInfo.changeGiven)}</td>
          </tr>
        </table>
        <hr/>
        <div class="footer">
          <p><strong>CHÍNH SÁCH BẢO HÀNH</strong></p>
          <p>Bảo hành 12 tháng chính hãng Apple</p>
          <p>Đổi trả trong 30 ngày nếu lỗi NSX</p>
          <p>Cảm ơn quý khách! Hẹn gặp lại!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // ============================================
  // FILTER PRODUCTS
  // ============================================
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-screen overflow-hidden">
      {/* LEFT: Product Selection */}
      <div className="lg:col-span-2 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Chọn sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessory"].map(
                (cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                )
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Đang tải sản phẩm...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Không có sản phẩm</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <Card
                    key={product._id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-3">
                      <img
                        src={
                          product.variants?.[0]?.images?.[0] ||
                          "/placeholder.png"
                        }
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {product.variants?.length} phiên bản
                      </p>

                      <div className="space-y-1">
                        {product.variants?.slice(0, 2).map((variant) => (
                          <Button
                            key={variant._id}
                            size="sm"
                            variant="outline"
                            className="w-full justify-between text-xs"
                            onClick={() => addToCart(product, variant)}
                            disabled={variant.stock === 0}
                          >
                            <span className="truncate">{variant.color}</span>
                            <span className="font-bold">
                              {formatPrice(variant.price)}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Cart & Checkout */}
      <div className="space-y-4 overflow-y-auto">
        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Giỏ hàng ({cart.length})
              </span>
              {cart.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearCart}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có sản phẩm
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-2 border-b pb-2"
                >
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.variantColor}
                      {item.variantStorage && ` • ${item.variantStorage}`}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between items-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(item.variantId)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.variantId, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.variantId, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <Input
              placeholder="Tên khách hàng (tùy chọn)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              placeholder="Số điện thoại (tùy chọn)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Tổng cộng:</span>
              <span className="text-primary">{formatPrice(getTotal())}</span>
            </div>

            <Input
              placeholder="Tiền khách đưa"
              type="number"
              value={paymentReceived}
              onChange={(e) => setPaymentReceived(e.target.value)}
              className="text-lg font-bold"
            />

            {paymentReceived && (
              <div className="flex justify-between text-lg font-bold text-green-600">
                <span>Tiền thối:</span>
                <span>{formatPrice(getChange())}</span>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading || cart.length === 0}
            >
              <Receipt className="w-5 h-5 mr-2" />
              {isLoading ? "Đang xử lý..." : "Thanh toán"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSDashboard;