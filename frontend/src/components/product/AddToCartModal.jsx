// ============================================
// FILE: frontend/src/components/product/AddToCartModal.jsx
// ✅ Modal thông báo thêm vào giỏ hàng thành công
// ============================================

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, ShoppingCart, X } from "lucide-react";

const AddToCartModal = ({ isOpen, onClose, product, variant }) => {
  const navigate = useNavigate();

  const handleGoToCart = () => {
    onClose();
    navigate("/cart");
  };

  const handleContinueShopping = () => {
    onClose();
  };

  if (!product || !variant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Thêm vào giỏ hàng thành công!
          </DialogTitle>
          <DialogDescription className="text-center">
            Sản phẩm đã được thêm vào giỏ hàng của bạn
          </DialogDescription>
        </DialogHeader>

        {/* Product Info */}
        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border">
          <img
            src={variant.images?.[0] || "/placeholder.png"}
            alt={product.name}
            className="w-20 h-20 object-cover rounded-md"
          />
          <div className="flex-1">
            <h4 className="font-semibold mb-1 line-clamp-2">{product.name}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {variant.color && <p>Màu: {variant.color}</p>}
              {variant.storage && <p>Dung lượng: {variant.storage}</p>}
              {variant.connectivity && <p>Kết nối: {variant.connectivity}</p>}
              {variant.variantName && <p>Phiên bản: {variant.variantName}</p>}
              <p className="text-red-600 font-semibold">
                {new Intl.NumberFormat("vi-VN").format(variant.price)}đ
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleContinueShopping}
            className="w-full sm:w-auto"
          >
            Tiếp tục mua sắm
          </Button>
          <Button
            onClick={handleGoToCart}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Đi đến giỏ hàng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartModal;