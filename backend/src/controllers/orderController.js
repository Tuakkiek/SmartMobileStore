// ============================================
// FILE: backend/src/controllers/orderController.js
// ✅ UPDATED: Removed Product references
// ============================================

import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { recordOrderSales } from "../services/salesAnalyticsService.js";
import { processOrderSales } from "../services/productSalesService.js";

// ✅ Helper: Find variant across all category models
const findVariantById = async (variantId) => {
  const { IPhoneVariant } = await import("../models/IPhone.js");
  const { IPadVariant } = await import("../models/IPad.js");
  const { MacVariant } = await import("../models/Mac.js");
  const { AirPodsVariant } = await import("../models/AirPods.js");
  const { AppleWatchVariant } = await import("../models/AppleWatch.js");
  const { AccessoryVariant } = await import("../models/Accessory.js");

  const models = [
    IPhoneVariant,
    IPadVariant,
    MacVariant,
    AirPodsVariant,
    AppleWatchVariant,
    AccessoryVariant,
  ];

  for (const Model of models) {
    const variant = await Model.findById(variantId).populate("productId");
    if (variant) return variant;
  }

  return null;
};

// ============================================
// GET CART
// ============================================
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      cart = await Cart.create({ customerId: req.user._id, items: [] });
    }

    // ✅ Populate variant data dynamically
    const populatedItems = await Promise.all(
      cart.items.map(async (item) => {
        if (!item.variantId) return item.toObject();

        const variant = await findVariantById(item.variantId);
        if (!variant) return item.toObject();

        return {
          ...item.toObject(),
          variant: {
            _id: variant._id,
            color: variant.color,
            storage: variant.storage,
            price: variant.price,
            stock: variant.stock,
            images: variant.images,
            sku: variant.sku,
          },
          product: {
            _id: variant.productId._id,
            name: variant.productId.name,
            model: variant.productId.model,
            category: variant.productId.category,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...cart.toObject(),
        items: populatedItems,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADD TO CART
// ============================================
export const addToCart = async (req, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp variantId",
      });
    }

    // ✅ Find variant across all models
    const variant = await findVariantById(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Biến thể không tồn tại",
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
      });
    }

    const itemData = {
      variantId: variant._id,
      productId: variant.productId._id,
      quantity,
      price: variant.price,
      sku: variant.sku,
    };

    let cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        customerId: req.user._id,
        items: [itemData],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.variantId && item.variantId.toString() === variantId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push(itemData);
      }
      await cart.save();
    }

    // Re-fetch with populated data
    const updatedCart = await getCart(req, res);
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// UPDATE CART ITEM
// ============================================
export const updateCartItem = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp variantId",
      });
    }

    const variant = await findVariantById(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biến thể",
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
      });
    }

    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Giỏ hàng không tồn tại",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variantId && item.variantId.toString() === variantId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    // Return updated cart
    return getCart(req, res);
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// REMOVE FROM CART
// ============================================
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Giỏ hàng không tồn tại",
      });
    }

    cart.items = cart.items.filter(
      (item) => (item._id ? item._id.toString() : "") !== itemId
    );

    await cart.save();

    return getCart(req, res);
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// CLEAR CART
// ============================================
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Giỏ hàng không tồn tại",
      });
    }

    cart.items = [];
    await cart.save();

    res.json({ success: true, message: "Đã xóa toàn bộ giỏ hàng" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
