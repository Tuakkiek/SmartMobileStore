// ============================================
// FILE: frontend/src/components/product/ProductVariantSelector.jsx
// Component tái sử dụng để chọn phiên bản sản phẩm
// ============================================

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * Component chọn phiên bản sản phẩm
 * @param {Object} product - Thông tin sản phẩm
 * @param {Function} onVariantChange - Callback khi thay đổi variant
 * @param {Object} selectedVariant - Variant đang được chọn
 */
const ProductVariantSelector = ({
  product,
  onVariantChange,
  selectedVariant = null,
}) => {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [availableOptions, setAvailableOptions] = useState([]);

  // Group variants by color
  const colorGroups = {};
  product.variants?.forEach((variant) => {
    const color = variant.color;
    if (!colorGroups[color]) {
      colorGroups[color] = {
        color,
        image: variant.images?.[0],
        options: [],
      };
    }
    colorGroups[color].options.push(variant);
  });

  const colors = Object.keys(colorGroups);

  // Set initial color
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      setSelectedColor(colors[0]);
    }
  }, [colors]);

  // Update available options when color changes
  useEffect(() => {
    if (selectedColor && colorGroups[selectedColor]) {
      setAvailableOptions(colorGroups[selectedColor].options);
      if (colorGroups[selectedColor].options.length > 0) {
        setSelectedOption(colorGroups[selectedColor].options[0]);
      }
    }
  }, [selectedColor]);

  // Notify parent when variant changes
  useEffect(() => {
    if (selectedOption) {
      onVariantChange?.(selectedOption);
    }
  }, [selectedOption]);

  // Get option label based on product type
  const getOptionLabel = (variant) => {
    if (variant.storage) {
      return `${variant.storage}${
        variant.connectivity ? ` - ${variant.connectivity}` : ""
      }`;
    }
    if (variant.cpuGpu) {
      return `${variant.cpuGpu} • ${variant.ram} • ${variant.storage}`;
    }
    if (variant.variantName) {
      return variant.variantName;
    }
    return "Standard";
  };

  return (
    <div className="space-y-6">
      {/* Selected Image */}
      {selectedColor && colorGroups[selectedColor]?.image && (
        <div className="flex justify-center">
          <img
            src={colorGroups[selectedColor].image}
            alt={product.name}
            className="w-full max-w-md h-auto object-contain rounded-lg"
          />
        </div>
      )}

      {/* Product Name */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
        {selectedOption && (
          <p className="text-3xl font-bold text-primary">
            {formatPrice(selectedOption.price)}
          </p>
        )}
      </div>

      {/* Color Selection */}
      <div>
        <h3 className="font-semibold mb-3">Chọn màu sắc:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {colors.map((color) => (
            <Button
              key={color}
              variant={selectedColor === color ? "default" : "outline"}
              className="h-auto py-3 justify-start"
              onClick={() => setSelectedColor(color)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 text-left">
                  <p className="font-medium">{color}</p>
                </div>
                {selectedColor === color && <Check className="w-5 h-5" />}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Option Selection (Storage/RAM/etc) */}
      {availableOptions.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Chọn phiên bản:</h3>
          <div className="space-y-2">
            {availableOptions.map((variant) => (
              <Card
                key={variant._id}
                className={`cursor-pointer transition-all ${
                  selectedOption?._id === variant._id
                    ? "border-2 border-primary bg-primary/5"
                    : "hover:border-gray-400"
                }`}
                onClick={() => setSelectedOption(variant)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{getOptionLabel(variant)}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {variant.sku}
                      </p>
                      {variant.stock > 0 ? (
                        <Badge variant="outline" className="mt-1">
                          Còn hàng: {variant.stock}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="mt-1">
                          Hết hàng
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {formatPrice(variant.price)}
                      </p>
                      {variant.originalPrice > variant.price && (
                        <p className="text-sm line-through text-muted-foreground">
                          {formatPrice(variant.originalPrice)}
                        </p>
                      )}
                    </div>
                    {selectedOption?._id === variant._id && (
                      <Check className="w-6 h-6 text-primary ml-3" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stock Warning */}
      {selectedOption && selectedOption.stock === 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">
            ⚠️ Phiên bản này hiện đã hết hàng
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductVariantSelector;