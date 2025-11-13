// ============================================
// FILE: src/pages/customer/ProfilePage.jsx
// FIXED: Hiển thị 5 đơn + Nút "Xem thêm" + Bỏ PROCESSING
// ============================================

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { userAPI, orderAPI } from "@/lib/api";
import {
  User,
  MapPin,
  Lock,
  LogOut,
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Package,
  ChevronDown,
} from "lucide-react";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
} from "@/lib/utils";

// Placeholder ảnh lỗi
const PLACEHOLDER_IMG = "https://via.placeholder.com/64?text=No+Image";

const ProfilePage = () => {
  const { user, getCurrentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Tài khoản của tôi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{user?.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.phoneNumber}
                </p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "orders"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Đơn hàng của tôi</span>
                </button>

                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "profile"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Thông tin cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveTab("addresses")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "addresses"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Địa chỉ</span>
                </button>

                <button
                  onClick={() => setActiveTab("password")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "password"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span>Đổi mật khẩu</span>
                </button>
              </nav>

              <div className="pt-4 border-t">
                <LogoutButton />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === "orders" && <OrdersSection />}
          {activeTab === "profile" && (
            <ProfileForm user={user} onUpdate={getCurrentUser} />
          )}
          {activeTab === "addresses" && (
            <AddressesManager user={user} onUpdate={getCurrentUser} />
          )}
          {activeTab === "password" && <ChangePasswordForm />}
        </div>
      </div>
    </div>
  );
};


// ============================================
// ORDERS SECTION – CHUYỂN SANG TRANG CHI TIẾT
// ============================================

const OrdersSection = () => {
  const [orders, setOrders] = useState([]);           // Tất cả đơn đã load
  const [displayedOrders, setDisplayedOrders] = useState([]); // Đơn hiện trên UI
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);  // Tổng số đơn theo filter
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const navigate = useNavigate(); // THÊM ĐỂ CHUYỂN TRANG
  const pageSize = 5;

  // === LOAD ĐƠN HÀNG ===
  const loadOrders = async (reset = false) => {
    if (isLoading) return;
    setIsLoading(true);

    const currentPage = reset ? 1 : page;

    try {
      const response = await orderAPI.getMyOrders(
        currentPage,
        pageSize,
        statusFilter === "all" ? "" : statusFilter
      );

      const newOrders = response.data.data.orders || [];
      const total = response.data.data.total || 0;

      if (reset) {
        setTotalOrders(total);
        setOrders(newOrders);
        setDisplayedOrders(newOrders);
        setPage(2);
        setHasMore(newOrders.length < total);
      } else {
        const updatedOrders = [...orders, ...newOrders];
        setOrders(updatedOrders);
        setDisplayedOrders(updatedOrders);
        setPage(prev => prev + 1);
        setHasMore(updatedOrders.length < total);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
      if (reset) setIsInitialLoading(false);
    }
  };

  // === KHI ĐỔI FILTER → RESET + LOAD LẠI ===
  useEffect(() => {
    setOrders([]);
    setDisplayedOrders([]);
    setPage(1);
    setTotalOrders(0);
    setHasMore(true);
    setIsInitialLoading(true);
    loadOrders(true);
  }, [statusFilter]);

  // === NÚT XEM THÊM ===
  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadOrders(false);
    }
  };

  // === CHUYỂN TRANG CHI TIẾT (THAY VÌ MỞ DIALOG) ===
  const handleViewDetail = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = import.meta.env.VITE_API_URL || "";
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const getVariantLabel = (item) => {
    const parts = [];
    if (item.variantColor) parts.push(item.variantColor);
    if (item.variantStorage) parts.push(item.variantStorage);
    if (item.variantName) parts.push(item.variantName);
    if (item.variantConnectivity) parts.push(item.variantConnectivity);
    return parts.length > 0 ? parts.join(" • ") : "Không có";
  };

  const statusButtons = [
    { value: "all", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xử lý" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "DELIVERED", label: "Đã giao" },
    { value: "CANCELLED", label: "Đã hủy" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng đã mua</CardTitle>
        </CardHeader>
        <CardContent>
          {/* FILTER BUTTONS */}
          <div className="flex gap-2 overflow-x-auto pb-4 border-b mb-6">
            {statusButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={statusFilter === btn.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(btn.value)}
                className="whitespace-nowrap"
              >
                {btn.label}
              </Button>
            ))}
          </div>

          <div className="space-y-4 min-h-[400px]">
            {/* SKELETON */}
            {isInitialLoading ? (
              [...Array(5)].map((_, i) => (
                <OrderSkeleton key={i} />
              ))
            ) : displayedOrders.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Chưa có đơn hàng nào</p>
              </div>
            ) : (
              <>
                {displayedOrders.map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    onViewDetail={handleViewDetail} // TRUYỀN HÀM MỚI
                    getImageUrl={getImageUrl}
                    getVariantLabel={getVariantLabel}
                  />
                ))}

                {/* NÚT XEM THÊM */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          Xem thêm
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* END OF LIST */}
                {!hasMore && displayedOrders.length > 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    Đã hiển thị tất cả {displayedOrders.length} đơn hàng
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BỎ DIALOG CHI TIẾT → DÙNG TRANG RIÊNG */}
    </div>
  );
};

// ============================================
// SKELETON COMPONENT
// ============================================
const OrderSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        <div className="h-6 bg-muted rounded-full w-24 animate-pulse"></div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
        </div>
      </div>
      <div className="p-4 bg-muted/50 border-t flex justify-end">
        <div className="h-8 bg-muted rounded w-28 animate-pulse"></div>
      </div>
    </CardContent>
  </Card>
);

// ============================================
// ORDER CARD COMPONENT
// ============================================
const OrderCard = ({ order, onViewDetail, getImageUrl, getVariantLabel }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Đơn hàng:</p>
            <p className="font-semibold">#{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nhận hàng</p>
            <p className="font-medium">
              {order.shippingAddress?.fullName} ({order.shippingAddress?.phoneNumber})
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {getStatusText(order.status)}
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        {order.items?.map((item, index) => {
          const imageUrl = item.images?.[0] ? getImageUrl(item.images[0]) : null;
          const variantLabel = getVariantLabel(item);

          return (
            <div key={index} className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.productName}
                    className="w-full h-full object-cover rounded"
                    onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                  />
                ) : (
                  <Package className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium line-clamp-1">{item.productName}</h4>
                <p className="text-xs text-muted-foreground mt-1">{variantLabel}</p>
                <p className="text-sm text-muted-foreground">SL: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-muted/50 border-t flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => onViewDetail(order._id)}>
          Xem chi tiết
        </Button>
      </div>
    </CardContent>
  </Card>
);

// ============================================
// ORDER DETAIL DIALOG
// ============================================
const OrderDetailDialog = ({ open, onOpenChange, order, getImageUrl, getVariantLabel }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Chi tiết đơn hàng</DialogTitle>
        <DialogDescription>
          Mã đơn: #{order?.orderNumber}
        </DialogDescription>
      </DialogHeader>
      {order && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(order.status)}>
              {getStatusText(order.status)}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold">Địa chỉ nhận hàng</h4>
            <p className="text-sm">{order.shippingAddress?.fullName}</p>
            <p className="text-sm">{order.shippingAddress?.phoneNumber}</p>
            <p className="text-sm text-muted-foreground">
              {order.shippingAddress?.detailAddress},{" "}
              {order.shippingAddress?.commune},{" "}
              {order.shippingAddress?.district},{" "}
              {order.shippingAddress?.province}
            </p>
          </div>

          <div className="space-y-3">
            {order.items?.map((item, index) => {
              const imageUrl = item.images?.[0] ? getImageUrl(item.images[0]) : null;
              const variantLabel = getVariantLabel(item);

              return (
                <div key={index} className="flex gap-4 p-3 border rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.productName}</h4>
                    {variantLabel !== "Không có" && (
                      <p className="text-xs text-muted-foreground mt-1">{variantLabel}</p>
                    )}
                    <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between">
              <span>Tổng tiền:</span>
              <span className="font-bold text-xl text-primary">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Phương thức thanh toán:</span>
              <span>
                {order.paymentMethod === "COD"
                  ? "Thanh toán khi nhận hàng"
                  : "Chuyển khoản"}
              </span>
            </div>
          </div>
        </div>
      )}
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>Đóng</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ============================================
// CÁC COMPONENT KHÁC (GIỮ NGUYÊN)
// ============================================

const ProfileForm = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    province: user?.province || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await userAPI.updateProfile(formData);
      setSuccess("Cập nhật thông tin thành công");
      onUpdate();
    } catch (error) {
      setError(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}
          {success && (
            <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Họ và tên</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Số điện thoại</Label>
            <Input value={user?.phoneNumber} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Tỉnh/Thành phố</Label>
            <Input
              id="province"
              name="province"
              value={formData.province}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Đang cập nhật..." : "Cập nhật thông tin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const AddressesManager = ({ user, onUpdate }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    province: "",
    ward: "",
    detailAddress: "",
    isDefault: false,
  });

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await userAPI.updateAddress(editingId, formData);
      } else {
        await userAPI.addAddress(formData);
      }
      onUpdate();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDelete = async (addressId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;
    try {
      await userAPI.deleteAddress(addressId);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.message || "Xóa địa chỉ thất bại");
    }
  };

  const handleEdit = (address) => {
    setFormData(address);
    setEditingId(address._id);
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      province: "",
      ward: "",
      detailAddress: "",
      isDefault: false,
    });
    setShowDialog(false);
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Địa chỉ của tôi</CardTitle>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm địa chỉ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {user?.addresses?.map((address) => (
            <Card key={address._id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{address.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.phoneNumber}
                    </p>
                  </div>
                  {address.isDefault && <Badge>Mặc định</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {address.detailAddress}, {address.ward}, {address.province}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(address)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(address._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Số điện thoại</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Tỉnh/Thành phố</Label>
                <Input
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ward">Phường/Xã</Label>
                <Input
                  id="ward"
                  name="ward"
                  value={formData.ward}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detailAddress">Địa chỉ cụ thể</Label>
              <Input
                id="detailAddress"
                name="detailAddress"
                value={formData.detailAddress}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <Label htmlFor="isDefault">Đặt làm địa chỉ mặc định</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Hủy
              </Button>
              <Button type="submit">{editingId ? "Cập nhật" : "Thêm"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const ChangePasswordForm = () => {
  const { changePassword } = useAuthStore();
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);
    const result = await changePassword({
      oldPassword: formData.oldPassword,
      newPassword: formData.newPassword,
    });

    if (result.success) {
      setSuccess("Đổi mật khẩu thành công");
      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đổi mật khẩu</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}
          {success && (
            <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
            <Input
              id="oldPassword"
              name="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Đang cập nhật..." : "Đổi mật khẩu"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const LogoutButton = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bạn có chắc chắn muốn đăng xuất?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn sẽ cần đăng nhập lại để truy cập các tính năng của tài khoản.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600"
          >
            Xác nhận Đăng xuất
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ProfilePage;