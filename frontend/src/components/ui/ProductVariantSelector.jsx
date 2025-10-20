// ============================================
// FILE: src/components/ui/ProductVariantSelector.jsx
// ✅ PROFESSIONAL VARIANT SELECTOR
// ============================================

import React from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Check, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const ProductVariantSelector = ({ 
  variants, 
  onVariantChange, 
  selectedVariant,
  className = "" 
}) => {
  if (!variants?.length) return null;

  // Group by storage
  const storages = [...new Set(variants.map(v => v.storage))].sort();

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Chọn phiên bản
        </h3>
        
        <div className="space-y-6">
          {storages.map((storage, sIdx) => {
            const storageVariants = variants.filter(v => v.storage === storage);
            const minPrice = Math.min(...storageVariants.map(v => v.price));
            
            return (
              <div key={sIdx}>
                {/* Storage Header */}
                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                  <span className="font-medium text-sm">{storage}</span>
                  <span className="text-sm text-red-600 font-semibold">
                    từ {formatPrice(minPrice)}
                  </span>
                </div>
                
                {/* Color Options */}
                <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                  {storageVariants.map((variant, vIdx) => (
                    <button
                      key={vIdx}
                      onClick={() => onVariantChange(variant)}
                      disabled={variant.stock === 0}
                      className={`group relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 text-center ${
                        selectedVariant?._id === variant._id
                          ? "border-red-500 bg-red-50 shadow-md"
                          : variant.stock === 0
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                          : "border-gray-200 hover:border-red-300 hover:shadow-sm"
                      }`}
                    >
                      {/* Color Badge */}
                      <div 
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedVariant?._id === variant._id 
                            ? "border-red-500" 
                            : "border-gray-300"
                        }`}
                        style={{ 
                          backgroundColor: variant.colorHex || '#ccc' 
                        }}
                      ></div>
                      
                      {/* Color Name */}
                      <span className="text-xs font-medium">{variant.color}</span>
                      
                      {/* Price */}
                      <span className="text-xs text-gray-600 group-hover:text-red-600">
                        {formatPrice(variant.price)}
                      </span>
                      
                      {/* Stock Status */}
                      {variant.stock === 0 ? (
                        <span className="text-xs text-gray-400">Hết</span>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="text-xs h-4 px-1.5 absolute top-1 right-1"
                        >
                          {variant.stock}
                        </Badge>
                      )}
                      
                      {/* Selected Check */}
                      {selectedVariant?._id === variant._id && (
                        <Check className="absolute top-1 left-1 w-3 h-3 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Variant Summary */}
        {selectedVariant && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm font-medium">
              Đã chọn: {selectedVariant.color} • {selectedVariant.storage}
            </span>
            <Badge className="bg-red-500 hover:bg-red-600">
              {formatPrice(selectedVariant.price)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductVariantSelector;