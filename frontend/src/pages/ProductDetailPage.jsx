import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ShoppingCart, Star, Shield, Clock, Truck, Check } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedWarranty, setSelectedWarranty] = useState(null);

  // Reset scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRes = await productAPI.getById(id);
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

        try {
          const reviewsRes = await reviewAPI.getByProduct(id);
          setReviews(reviewsRes.data.data.reviews || []);
        } catch (reviewError) {
          console.warn(
            "Could not fetch reviews:",
            reviewError.response?.status
          );
          setReviews([]);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);
  useEffect(() => {
    if (!product) return;
    const variants = product.variants || [];
    const storages = Array.from(
      new Set(variants.flatMap((v) => v.options?.map((o) => o.name) || []))
    ).filter(Boolean);
    const colors = Array.from(new Set(variants.map((v) => v.name))).filter(
      Boolean
    );

    const defaultStorage = storages[0] || null;
    let defaultColor = colors[0] || null;
    if (defaultStorage) {
      const compatibleColors = variants
        .filter((v) => v.options?.some((o) => o.name === defaultStorage))
        .map((v) => v.name);
      if (compatibleColors.length) defaultColor = compatibleColors[0];
    }

    setSelectedStorage(defaultStorage);
    setSelectedColor(defaultColor);
    setSelectedWarranty({
      label: "1 đổi 1 12 tháng",
      months: 12,
      extraPrice: 0,
    });
  }, [product]);

  useEffect(() => {
    if (!product || !selectedColor) return;
    const variants = product.variants || [];
    const colorVariant = variants.find((v) => v.name === selectedColor);
    const imageUrl =
      colorVariant?.options?.[0]?.imageUrl || product.images?.[0];
    const imageIndex =
      product.images?.findIndex((img) => img === imageUrl) ?? 0;
    setSelectedImage(imageIndex);
  }, [selectedColor, product]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role !== "CUSTOMER") {
      toast.error("Chỉ khách hàng mới có thể thêm vào giỏ hàng");
      return;
    }

    const result = await addToCart(product._id, 1);
    if (result.success) {
      toast.success("Đã thêm vào giỏ hàng", {
        description: `${product.name}${
          selectedStorage ? " • " + selectedStorage : ""
        }${selectedColor ? " • " + selectedColor : ""}`,
      });
    } else {
      toast.error(result.message || "Thêm vào giỏ hàng thất bại");
    }
  };

  if (isLoading || !product) return <Loading />;

  const variants = product.variants || [];
  const storages = Array.from(
    new Set(variants.flatMap((v) => v.options?.map((o) => o.name) || []))
  ).filter(Boolean);
  const allColors = Array.from(new Set(variants.map((v) => v.name))).filter(
    Boolean
  );

  const colorsForStorage = (st) =>
    variants
      .filter((v) => v.options?.some((o) => o.name === st))
      .map((v) => v.name);

  const priceForStorage = (st) => {
    const prices = variants
      .filter((v) => v.options?.some((o) => o.name === st))
      .map((v) => v.options.find((o) => o.name === st)?.price || Infinity);
    return Math.min(...prices);
  };

  const priceForColorAndStorage = (color, st) => {
    const v = variants.find((v) => v.name === color);
    return v?.options?.find((o) => o.name === st)?.price || 0;
  };

  const imageForColor = (color) => {
    const v = variants.find((v) => v.name === color);
    return (
      v?.options?.[0]?.imageUrl || product.images?.[0] || "/placeholder.png"
    );
  };
  const warrantyOptions = [
    { label: "1 đổi 1 12 tháng", months: 12, extraPrice: 0 },
    { label: "1 đổi 1 24 tháng", months: 24, extraPrice: 1100000 },
  ];

  const basePrice = priceForColorAndStorage(selectedColor, selectedStorage);
  const finalPrice = basePrice + (selectedWarranty?.extraPrice || 0);
  const originalPrice =
    variants
      .find((v) => v.name === selectedColor)
      ?.options?.find((o) => o.name === selectedStorage)?.originalPrice ||
    product.originalPrice;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-6 bg-white">
                <img
                  src={product.images?.[selectedImage] || "/placeholder.png"}
                  alt={product.name}
                  className="w-full h-auto max-h-[400px] object-contain"
                />
              </CardContent>
            </Card>

            {product.images?.length > 1 && (
              <div className="grid grid-cols-7 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImage === index
                        ? "border-red-500"
                        : "border-gray-200"
                    } hover:border-red-500 transition`}
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

          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <h1 className="text-2xl font-bold flex-1">{product.name}</h1>
                  <Badge className={getStatusColor(product.status)}>
                    {getStatusText(product.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.averageRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span>({reviews.length} đánh giá)</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-600 border-blue-200"
                  >
                    Mới 100%
                  </Badge>
                </div>
                {product.model && (
                  <p className="text-gray-600 mb-2">
                    <strong>Mã sản phẩm:</strong> {product.model}
                  </p>
                )}
                {product.specifications?.manufacturer && (
                  <p className="text-gray-600 mb-2">
                    <strong>Hãng sản xuất:</strong>{" "}
                    {product.specifications.manufacturer}
                  </p>
                )}
                {product.specifications?.condition && (
                  <p className="text-gray-600 mb-2">
                    <strong>Tình trạng:</strong>{" "}
                    {product.specifications.condition}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-red-500">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-red-600">
                      {formatPrice(finalPrice)} đ
                    </span>
                    {originalPrice > finalPrice && (
                      <>
                        <span className="text-lg text-gray-400 line-through">
                          {formatPrice(originalPrice)} đ
                        </span>
                        <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
                          Trả góp 0%
                        </Badge>
                      </>
                    )}
                  </div>
                  {selectedWarranty?.extraPrice > 0 && (
                    <p className="text-sm text-gray-600">
                      Giá trả góp chỉ từ{" "}
                      <span className="font-semibold">0đ</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <strong>Ưu đãi:</strong> Miễn phí vận chuyển toàn quốc
                  </p>
                </div>
              </CardContent>
            </Card>

            {storages.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Phiên bản khác</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {storages.map((st, idx) => {
                      const variantPrice = priceForStorage(st);
                      return (
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
                          className={`p-3 rounded-lg border-2 text-sm transition relative ${
                            selectedStorage === st
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200 hover:border-red-300"
                          }`}
                        >
                          <div className="font-semibold text-center">{st}</div>
                          <div className="text-xs text-gray-600 text-center mt-1">
                            {formatPrice(variantPrice)} đ
                          </div>
                          {selectedStorage === st && (
                            <Badge className="absolute top-1 right-1 bg-green-500">
                              <Check className="w-3 h-3" />
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {allColors.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">
                    Chọn màu sắc hoặc tình trạng máy:
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {colorsForStorage(selectedStorage).map((color, idx) => {
                      const colorPrice = priceForColorAndStorage(
                        color,
                        selectedStorage
                      );
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedColor(color)}
                          className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-2 relative ${
                            selectedColor === color
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200 hover:border-red-300"
                          }`}
                        >
                          <span className="text-sm font-medium">{color}</span>
                          <span className="text-xs text-gray-600">
                            {formatPrice(colorPrice)} đ
                          </span>
                          {selectedColor === color && (
                            <Badge className="absolute top-1 right-1 bg-green-500">
                              <Check className="w-3 h-3" />
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {warrantyOptions.length > 0 && (
              <Card className="border-2 border-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold">Bảo hành</h3>
                  </div>
                  <div className="space-y-2">
                    {warrantyOptions.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between gap-3 border-2 rounded-lg p-4 cursor-pointer transition ${
                          selectedWarranty?.label === opt.label
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 hover:border-red-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="radio"
                            name="warranty"
                            checked={selectedWarranty?.label === opt.label}
                            onChange={() => setSelectedWarranty(opt)}
                            className="w-4 h-4 text-red-500"
                          />
                          <div className="flex items-center gap-2">
                            {opt.extraPrice === 0 && (
                              <Badge className="bg-red-500 hover:bg-red-600">
                                <Clock className="w-3 h-3 mr-1" />
                                Hot
                              </Badge>
                            )}
                            <span className="font-medium">{opt.label}</span>
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            opt.extraPrice > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {opt.extraPrice > 0
                            ? `+ ${formatPrice(opt.extraPrice)}`
                            : "Miễn phí"}
                        </div>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Giao hàng</h3>
                </div>
                <p className="text-gray-600">
                  Giao hàng toàn quốc, miễn phí vận chuyển cho đơn hàng từ
                  500.000đ
                </p>
              </CardContent>
            </Card>

            <div className="relative bg-white border-t pt-4">
              <Button
                className="w-full h-14 text-lg font-semibold bg-red-500 hover:bg-red-600"
                onClick={handleAddToCart}
                disabled={
                  product.status !== "AVAILABLE" || product.quantity === 0
                }
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Thêm vào giỏ hàng
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {product.description && (
            <Card>
              <CardHeader>
                <h3 className="text-xl font-bold">Mô tả sản phẩm</h3>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600 whitespace-pre-line">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          )}

          {product.specifications && (
            <Card>
              <CardHeader>
                <h3 className="text-xl font-bold">Thông số kỹ thuật</h3>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2 text-sm">
                  {product.specifications.screenSize && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Màn hình:</span>
                      <span className="font-medium">
                        {product.specifications.screenSize}
                      </span>
                    </div>
                  )}
                  {product.specifications.resolution && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Độ phân giải:</span>
                      <span className="font-medium">
                        {product.specifications.resolution}
                      </span>
                    </div>
                  )}
                  {product.specifications.cpu && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">CPU:</span>
                      <span className="font-medium">
                        {product.specifications.cpu}
                      </span>
                    </div>
                  )}
                  {product.specifications.ram && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">RAM:</span>
                      <span className="font-medium">
                        {product.specifications.ram}
                      </span>
                    </div>
                  )}
                  {product.specifications.storage && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Dung lượng:</span>
                      <span className="font-medium">
                        {product.specifications.storage}
                      </span>
                    </div>
                  )}
                  {product.specifications.mainCamera && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Camera chính:</span>
                      <span className="font-medium">
                        {product.specifications.mainCamera}
                      </span>
                    </div>
                  )}
                  {product.specifications.frontCamera && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Camera selfie:</span>
                      <span className="font-medium">
                        {product.specifications.frontCamera}
                      </span>
                    </div>
                  )}
                  {product.specifications.battery && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Pin:</span>
                      <span className="font-medium">
                        {product.specifications.battery}
                      </span>
                    </div>
                  )}
                  {product.specifications.weight && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Trọng lượng:</span>
                      <span className="font-medium">
                        {product.specifications.weight}
                      </span>
                    </div>
                  )}
                  {product.specifications.dimensions && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Kích thước:</span>
                      <span className="font-medium">
                        {product.specifications.dimensions}
                      </span>
                    </div>
                  )}
                  {product.specifications.operatingSystem && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Hệ điều hành:</span>
                      <span className="font-medium">
                        {product.specifications.operatingSystem}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {reviews.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <h3 className="text-xl font-bold">Đánh giá ({reviews.length})</h3>
            </CardHeader>
            <CardContent className="p-6">
              {reviews.map((review, idx) => (
                <div key={idx} className="border-b py-4 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">
                      {review.user?.name || "Ẩn danh"}
                    </span>
                    <div className="flex gap-0.5">
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
                  <p className="text-gray-600">{review.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
