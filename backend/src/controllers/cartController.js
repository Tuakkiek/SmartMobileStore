// ============================================
// FILE: backend/src/controllers/cartController.js
// ✅ FIXED: Cart + Variants - EXPORT DEFAULT OK
// ============================================

import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";

// Lấy giỏ hàng của người dùng
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ customerId: req.user._id }).populate([
      {
        path: "items.productId",
        select: "name model images"
      },
      {
        path: "items.variantId",
        populate: {
          path: "productId",
          select: "name model images"
        }
      }
    ]);

    if (!cart) {
      cart = await Cart.create({ customerId: req.user._id, items: [] });
    }

    // Format cart items để frontend dễ dùng
    const formattedItems = cart.items.map(item => ({
      ...item.toObject(),
      productName: item.productId?.name || item.variantId?.productId?.name,
      productImages: item.productId?.images || item.variantId?.productId?.images || [],
      variantColor: item.variantId?.color,
      variantStorage: item.variantId?.storage,
      variantImages: item.variantId?.images,
      hasVariant: !!item.variantId
    }));

    res.json({ 
      success: true, 
      data: { 
        ...cart.toObject(), 
        items: formattedItems 
      } 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Thêm sản phẩm vào giỏ hàng - VALIDATE VARIANT ID
export const addToCart = async (req, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;

    if (!variantId) {
      return res.status(400).json({ 
        success: false, 
        message: "Cần cung cấp variantId" 
      });
    }

    // Lấy variant info
    const variant = await Variant.findById(variantId).populate('productId', 'name model images status');
    
    if (!variant) {
      return res.status(404).json({ 
        success: false, 
        message: "Biến thể không tồn tại" 
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Chỉ còn ${variant.stock} sản phẩm trong kho` 
      });
    }

    const itemData = {
      variantId: variant._id,
      productId: variant.productId._id,
      quantity,
      price: variant.price,
      sku: variant.sku
    };

    let cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      cart = await Cart.create({ customerId: req.user._id, items: [itemData] });
    } else {
      const itemIndex = cart.items.findIndex(item => 
        item.variantId && item.variantId.toString() === variantId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push(itemData);
      }
      await cart.save();
    }

    cart = await cart.populate([
      { path: "items.productId", select: "name model images" },
      { path: "items.variantId", populate: { path: "productId", select: "name model images" } }
    ]);

    res.json({
      success: true,
      message: "Đã thêm vào giỏ hàng",
      data: cart
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Cập nhật sản phẩm trong giỏ hàng - SUPPORT VARIANT
export const updateCartItem = async (req, res) => {
  try {
    const { variantId, productId, quantity } = req.body;

    let stockCheckId, maxStock;
    if (variantId) {
      const variant = await Variant.findById(variantId);
      if (!variant) return res.status(404).json({ success: false, message: "Biến thể không tồn tại" });
      stockCheckId = variantId;
      maxStock = variant.stock;
    } else if (productId) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
      stockCheckId = productId;
      maxStock = product.quantity;
    }

    if (maxStock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Chỉ còn ${maxStock} sản phẩm trong kho` 
      });
    }

    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Giỏ hàng không tồn tại" });
    }

    let itemIndex = -1;
    if (variantId) {
      itemIndex = cart.items.findIndex(item => 
        item.variantId && item.variantId.toString() === variantId
      );
    } else {
      itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId
      );
    }

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Sản phẩm không có trong giỏ hàng" });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate([
      { path: "items.productId", select: "name model images" },
      { path: "items.variantId", populate: { path: "productId", select: "name model images" } }
    ]);

    res.json({
      success: true,
      message: "Cập nhật giỏ hàng thành công",
      data: cart
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa sản phẩm khỏi giỏ hàng - SUPPORT VARIANT
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Giỏ hàng không tồn tại" });
    }

    cart.items = cart.items.filter(item => 
      (item._id ? item._id.toString() : '') !== itemId
    );
    
    await cart.save();
    await cart.populate([
      { path: "items.productId", select: "name model images" },
      { path: "items.variantId", populate: { path: "productId", select: "name model images" } }
    ]);

    res.json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
      data: cart
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa toàn bộ giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Giỏ hàng không tồn tại" });
    }

    cart.items = [];
    await cart.save();
    res.json({ success: true, message: "Đã xóa toàn bộ giỏ hàng" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};