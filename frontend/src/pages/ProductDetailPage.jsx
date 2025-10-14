// ============================================
// FILE: src/pages/ProductDetailPage.jsx
// ============================================
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ShoppingCart, Star, Minus, Plus } from "lucide-react";
import { productAPI, reviewAPI } from "@/lib/api";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatPrice, getStatusColor, getStatusText } from "@/lib/utils";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [selectedWarranty, setSelectedWarranty] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, reviewsRes] = await Promise.all([
          productAPI.getById(id),
          reviewAPI.getByProduct(id),
        ]);

        const p = productRes.data.data.product;
        if (p && p.specifications) {
          const s = p.specifications || {};
          p.specifications = {
            screenSize: s.screenSize || s.screen || "",
            cpu: s.cpu || s.chip || "",
            operatingSystem: s.operatingSystem || s.os || "",
            storage: s.storage || "",
            ram: s.ram || "",
            mainCamera: s.mainCamera || s.camera || "",
            frontCamera: s.frontCamera || "",
            colors: Array.isArray(s.colors)
              ? s.colors
              : s.color
              ? [s.color]
              : [],
            resolution: s.resolution || "",
            manufacturer: s.manufacturer || "",
            condition: s.condition || "",
            battery: s.battery || "",
            weight: s.weight || "",
            dimensions: s.dimensions || "",
          };
        }

        setProduct(p);
        setReviews(reviewsRes.data.data.reviews);
      } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.message || error.message;
        console.error("Error fetching data:", status, msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Init selection based on actual variants
  useEffect(() => {
    if (!product) return;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const storages = Array.from(new Set(variants.map((v) => v.storage))).filter(
      Boolean
    );
    const colorsFromVariants = Array.from(
      new Set(variants.map((v) => v.color))
    ).filter(Boolean);
    const fallbackColors = product.specifications?.colors || [];
    const colors =
      colorsFromVariants.length > 0 ? colorsFromVariants : fallbackColors;

    const defaultStorage = storages[0] || null;
    let defaultColor = colors[0] || null;
    if (defaultStorage) {
      const cs = variants
        .filter((v) => v.storage === defaultStorage)
        .map((v) => v.color);
      if (cs.length > 0) defaultColor = cs[0];
    }

    setSelectedStorage(defaultStorage);
    setSelectedColor(defaultColor);
    setSelectedWarranty({
      label: "1 đổi 1 12 tháng",
      months: 12,
      extraPrice: 0,
    });
  }, [product]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role !== "CUSTOMER") {
      return;
    }

    const result = await addToCart(product._id, quantity);
    if (result.success) {
      setQuantity(1);
      toast.success("Đã thêm vào giỏ hàng", {
        description: `${product.name} • ${
          selectedStorage?.label ||
          product.specifications?.storage ||
          "Mặc định"
        }${selectedColor ? " • " + selectedColor : ""}`,
      });
    } else {
      toast.error(result.message || "Thêm vào giỏ hàng thất bại");
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (user?.role !== "CUSTOMER") {
      return;
    }
    const result = await addToCart(product._id, quantity);
    if (result.success) {
      toast.success("Đã thêm vào giỏ hàng", {
        description: `${product.name} • ${
          selectedStorage?.label ||
          product.specifications?.storage ||
          "Mặc định"
        }${selectedColor ? " • " + selectedColor : ""}`,
      });
      navigate("/checkout");
    } else {
      toast.error(result.message || "Không thể mua ngay lúc này");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Không tìm thấy sản phẩm</p>
      </div>
    );
  }

  // Derived options and price
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const storages = Array.from(new Set(variants.map((v) => v.storage))).filter(
    Boolean
  );
  const allColorsFromVariants = Array.from(
    new Set(variants.map((v) => v.color))
  ).filter(Boolean);
  const colorOptions =
    allColorsFromVariants.length > 0
      ? allColorsFromVariants
      : product.specifications?.colors || [];
  const colorsForStorage = (st) =>
    variants.filter((v) => v.storage === st).map((v) => v.color);
  const selectedVariant = variants.find(
    (v) => v.storage === selectedStorage && v.color === selectedColor
  );

  const priceForStorage = (st) => {
    const prices = variants
      .filter((v) => v.storage === st)
      .map((v) => v.price)
      .filter((p) => Number.isFinite(p));
    return prices.length ? Math.min(...prices) : product.price;
  };

  const warrantyOptions = [
    { label: "1 đổi 1 12 tháng", months: 12, extraPrice: 0 },
    { label: "1 đổi 1 24 tháng", months: 24, extraPrice: 1100000 },
  ];

  const basePrice =
    selectedVariant?.price ??
    (selectedStorage ? priceForStorage(selectedStorage) : product.price);
  const finalPrice = basePrice + (selectedWarranty?.extraPrice || 0);

  const colorToCss = (name) => {
    if (!name) return "#ccc";
    const map = {
      black: "#000000",
      trắng: "#ffffff",
      white: "#ffffff",
      silver: "#c0c0c0",
      bạc: "#c0c0c0",
      gold: "#d4af37",
      vàng: "#d4af37",
      blue: "#1e40af",
      xanh: "#1e40af",
      "xanh dương": "#1e3a8a",
      green: "#10b981",
      pink: "#ec4899",
      hồng: "#ec4899",
      purple: "#8b5cf6",
      tím: "#8b5cf6",
      red: "#ef4444",
      đỏ: "#ef4444",
      orange: "#f97316",
      cam: "#f97316",
      gray: "#6b7280",
      xám: "#6b7280",
      graphite: "#4b5563",
      "deep blue": "#1e3a8a",
      "cosmic orange": "#ea580c",
    };
    const key = String(name).toLowerCase();
    return map[key] || name;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-lg overflow-hidden border">
            <img
              src={product.images?.[selectedImage] || "/placeholder.png"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge className={getStatusColor(product.status)}>
              {getStatusText(product.status)}
            </Badge>
            <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
            <p className="text-muted-foreground mt-1">Mã: {product.model}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.floor(product.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              ({product.totalReviews} đánh giá)
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-primary">
                {formatPrice(finalPrice)}
              </span>
              {product.discount > 0 && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <Badge className="bg-red-500">-{product.discount}%</Badge>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Còn lại: {product.quantity} sản phẩm
            </p>
          </div>

          {/* Storage Options */}
          {storages.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Dung lượng</h3>
                <div className="flex flex-wrap gap-2">
                  {storages.map((st, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedStorage(st);
                        const compatColors = colorsForStorage(st);
                        if (
                          compatColors.length &&
                          !compatColors.includes(selectedColor)
                        ) {
                          setSelectedColor(compatColors[0]);
                        }
                      }}
                      className={`px-4 py-2 rounded-md border text-sm hover:border-primary transition ${
                        selectedStorage === st
                          ? "border-primary"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="font-medium">{st}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(priceForStorage(st))}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Color Options */}
          {colorOptions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Màu sắc</h3>
                <div className="flex flex-wrap gap-3">
                  {(colorsForStorage(selectedStorage) || colorOptions).map(
                    (color, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedColor(color)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border transition ${
                          selectedColor === color
                            ? "border-primary"
                            : "border-gray-200"
                        }`}
                        title={color}
                      >
                        <span
                          className="inline-block w-5 h-5 rounded-full border"
                          style={{ backgroundColor: colorToCss(color) }}
                        />
                        <span className="text-sm">{color}</span>
                      </button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warranty Options (radio style) */}
          {warrantyOptions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Bảo hành</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {warrantyOptions.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between gap-3 border rounded-md p-3 cursor-pointer ${
                        selectedWarranty?.label === opt.label
                          ? "border-primary"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="warranty"
                          checked={selectedWarranty?.label === opt.label}
                          onChange={() => setSelectedWarranty(opt)}
                        />
                        <span className="font-medium">{opt.label}</span>
                      </div>
                      <div
                        className={`text-sm ${
                          opt.extraPrice > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {opt.extraPrice > 0
                          ? `+${formatPrice(opt.extraPrice)}`
                          : "Miễn phí"}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          {product.specifications && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Thông số kỹ thuật</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {product.specifications.screenSize && (
                    <div>
                      <span className="text-muted-foreground">
                        Kích thước màn hình:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.screenSize}
                      </span>
                    </div>
                  )}
                  {product.specifications.cpu && (
                    <div>
                      <span className="text-muted-foreground">CPU:</span>
                      <span className="ml-2 font-medium">
                        {product.specifications.cpu}
                      </span>
                    </div>
                  )}
                  {product.specifications.operatingSystem && (
                    <div>
                      <span className="text-muted-foreground">
                        Hệ điều hành:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.operatingSystem}
                      </span>
                    </div>
                  )}
                  {product.specifications.storage && (
                    <div>
                      <span className="text-muted-foreground">
                        Bộ nhớ trong:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.storage}
                      </span>
                    </div>
                  )}
                  {product.specifications.ram && (
                    <div>
                      <span className="text-muted-foreground">RAM:</span>
                      <span className="ml-2 font-medium">
                        {product.specifications.ram}
                      </span>
                    </div>
                  )}
                  {product.specifications.mainCamera && (
                    <div>
                      <span className="text-muted-foreground">
                        Camera chính:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.mainCamera}
                      </span>
                    </div>
                  )}
                  {product.specifications.frontCamera && (
                    <div>
                      <span className="text-muted-foreground">
                        Camera trước:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.frontCamera}
                      </span>
                    </div>
                  )}
                  {product.specifications.colors &&
                    product.specifications.colors.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Màu sắc:</span>
                        <span className="ml-2 font-medium">
                          {product.specifications.colors.join(", ")}
                        </span>
                      </div>
                    )}
                  {product.specifications.resolution && (
                    <div>
                      <span className="text-muted-foreground">
                        Độ phân giải màn hình:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.resolution}
                      </span>
                    </div>
                  )}
                  {product.specifications.manufacturer && (
                    <div>
                      <span className="text-muted-foreground">
                        Hãng sản xuất:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.manufacturer}
                      </span>
                    </div>
                  )}
                  {product.specifications.condition && (
                    <div>
                      <span className="text-muted-foreground">
                        Tình trạng SP:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.condition}
                      </span>
                    </div>
                  )}
                  {product.specifications.battery && (
                    <div>
                      <span className="text-muted-foreground">Pin:</span>
                      <span className="ml-2 font-medium">
                        {product.specifications.battery}
                      </span>
                    </div>
                  )}
                  {product.specifications.weight && (
                    <div>
                      <span className="text-muted-foreground">
                        Trọng lượng:
                      </span>
                      <span className="ml-2 font-medium">
                        {product.specifications.weight}
                      </span>
                    </div>
                  )}
                  {product.specifications.dimensions && (
                    <div>
                      <span className="text-muted-foreground">Kích thước:</span>
                      <span className="ml-2 font-medium">
                        {product.specifications.dimensions}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-4 font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setQuantity(Math.min(product.quantity, quantity + 1))
                }
                disabled={quantity >= product.quantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              className="flex-1"
              size="lg"
              onClick={handleAddToCart}
              disabled={
                product.status !== "AVAILABLE" || product.quantity === 0
              }
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Thêm vào giỏ hàng
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="default"
              onClick={handleBuyNow}
              disabled={
                product.status !== "AVAILABLE" || product.quantity === 0
              }
            >
              Mua ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-4">Mô tả sản phẩm</h3>
            <p className="text-muted-foreground whitespace-pre-line">
              {product.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">
            Đánh giá ({reviews.length})
          </h3>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Chưa có đánh giá nào
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">
                      {review.customerId?.fullName}
                    </span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetailPage;
