// ============================================
// FILE: src/pages/ProductDetailPage.jsx
// ✅ COMBINED: Cũ + Mới - Gallery đẹp với Card UI
// ============================================

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { productAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // ✅ Track ảnh đang xem
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get product
        const productRes = await productAPI.getById(id);
        setProduct(productRes.data.data.product);

        // Get variants
        const variantsRes = await productAPI.getVariants(id);
        const variantsList = variantsRes.data.data.variants;
        setVariants(variantsList);

        // Set default variant (first available)
        const defaultVariant = variantsList.find(v => v.stock > 0) || variantsList[0];
        if (defaultVariant) {
          setSelectedVariant(defaultVariant);
          setSelectedImageIndex(0); // Reset ảnh về đầu
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ✅ Khi chọn variant mới → reset ảnh về đầu
  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setSelectedImageIndex(0);
  };

  // ✅ Lấy BỘ ảnh hiện tại
  const currentImages = selectedVariant?.images?.length > 0 
    ? selectedVariant.images 
    : product?.images || [];

  if (isLoading) return <div className="container mx-auto py-12 text-center">Loading...</div>;

  if (!product) return <div className="container mx-auto py-12 text-center">Sản phẩm không tồn tại</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ✅ CỘT TRÁI: BỘ ảnh - UI MỚI */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Image - UI MỚI */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 bg-white">
              <img
                src={currentImages[selectedImageIndex] || "/placeholder.png"}
                alt={`${product?.name} - ${selectedVariant?.color}`}
                className="w-full h-auto max-h-[400px] object-contain"
              />
            </CardContent>
          </Card>

          {/* Thumbnails - UI MỚI */}
          {currentImages.length > 1 && (
            <div className="grid grid-cols-7 gap-2">
              {currentImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                    selectedImageIndex === index 
                      ? "border-red-500 ring-2 ring-red-200" 
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <img
                    src={image}
                    alt={`View ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* INFO: Số lượng ảnh */}
          <p className="text-sm text-gray-500 text-center">
            Ảnh {selectedImageIndex + 1}/{currentImages.length} • Màu: {selectedVariant?.color}
          </p>
        </div>

        {/* CỘT PHẢI: Chi tiết sản phẩm */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            <p className="text-lg text-gray-600">{product.model}</p>
          </div>
          
          {/* CHỌN MÀU & STORAGE */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Chọn màu:</h3>
              <div className="flex flex-wrap gap-2">
                {[...new Set(variants.map(v => v.color))].map((color) => {
                  const colorVariants = variants.filter(v => v.color === color);
                  const isSelected = selectedVariant?.color === color;
                  
                  return (
                    <button
                      key={color}
                      onClick={() => handleVariantChange(colorVariants[0])}
                      className={`px-4 py-2 rounded-lg border-2 transition ${
                        isSelected 
                          ? "border-red-500 bg-red-50 text-red-700" 
                          : "border-gray-200 hover:border-red-300"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Chọn dung lượng:</h3>
              <div className="flex flex-wrap gap-2">
                {variants
                  .filter(v => v.color === selectedVariant?.color)
                  .map((variant) => (
                    <button
                      key={variant._id}
                      onClick={() => handleVariantChange(variant)}
                      disabled={variant.stock === 0}
                      className={`px-4 py-2 rounded-lg border-2 transition ${
                        selectedVariant?._id === variant._id
                          ? "border-red-500 bg-red-50 text-red-700"
                          : variant.stock === 0
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "border-gray-200 hover:border-red-300"
                      }`}
                    >
                      {variant.storage}
                      {variant.ram && ` • ${variant.ram}`}
                      {variant.stock === 0 && <span className="ml-1">⚠️</span>}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* GIÁ & ADD TO CART */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-red-600">
                    {formatPrice(selectedVariant?.price || product.price || 0)}
                  </p>
                  {selectedVariant?.originalPrice > selectedVariant?.price && (
                    <p className="text-lg text-gray-500 line-through">
                      {formatPrice(selectedVariant?.originalPrice)}
                    </p>
                  )}
                </div>
                
                <p className="text-sm text-green-600">
                  {selectedVariant?.stock > 0 ? `Còn ${selectedVariant.stock} sản phẩm` : "Hết hàng"}
                </p>

                <button 
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    selectedVariant?.stock > 0 
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={selectedVariant?.stock === 0}
                >
                  {selectedVariant?.stock > 0 ? "Thêm vào giỏ hàng" : "Hết hàng"}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* THÔNG TIN SẢN PHẨM */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Thông số kỹ thuật</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Danh mục:</strong> {product.category}</div>
                <div><strong>Tình trạng:</strong> {product.condition}</div>
                <div><strong>Trạng thái:</strong> {product.status}</div>
                <div><strong>Chip:</strong> {selectedVariant?.cpuGpu || "N/A"}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;