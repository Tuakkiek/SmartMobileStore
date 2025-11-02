// ============================================
// FILE: backend/src/controllers/cartController.js
// ✅ UPDATED: Multi-model support for Cart
// ============================================
import Cart from "../models/Cart.js";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

// Helper: Lấy Model và Variant Model dựa trên productType
const getModelsByType = (productType) => {
  const models = {
    iPhone: { Product: IPhone, Variant: IPhoneVariant },
    iPad: { Product: IPad, Variant: IPadVariant },
    Mac: { Product: Mac, Variant: MacVariant },
    AirPods: { Product: AirPods, Variant: AirPodsVariant },
    AppleWatch: { Product: AppleWatch, Variant: AppleWatchVariant },
    Accessory: { Product: Accessory, Variant: AccessoryVariant },
  };
  return models[productType] || null;
};

// Helper: Populate cart items với thông tin chi tiết
const populateCartItems = async (cart) => {
  const populatedItems = [];

  for (const item of cart.items) {
    const models = getModelsByType(item.productType);
    if (!models) {
      console.warn(`Unknown productType: ${item.productType}`);
      continue;
    }

    try {
      const variant = await models.Variant.findById(item.variantId);
      if (!variant) {
        console.warn(`Variant not found: ${item.variantId}`);
        continue;
      }

      const product = await models.Product.findById(variant.productId);
      if (!product) {
        console.warn(`Product not found: ${variant.productId}`);
        continue;
      }

      populatedItems.push({
        _id: item._id,
        productId: product._id,
        variantId: variant._id,
        productType: item.productType,
        productName: product.name,
        productModel: product.model,
        productSlug: product.slug || product.baseSlug,
        variantSlug: variant.slug,
        variantSku: variant.sku,
        variantColor: variant.color,
        variantStorage: variant.storage,
        variantName: variant.variantName,
        variantConnectivity: variant.connectivity,
        variantCpuGpu: variant.cpuGpu,
        variantRam: variant.ram,
        quantity: item.quantity,
        price: item.price,
        originalPrice: variant.originalPrice,
        stock: variant.stock,
        images: variant.images || [],
        productImages: product.images || [],
      });
    } catch (error) {
      console.error(`Error populating item ${item._id}:`, error);
    }
  }

  return populatedItems;
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

    const formattedItems = await populateCartItems(cart);

    res.json({
      success: true,
      data: {
        _id: cart._id,
        customerId: cart.customerId,
        items: formattedItems,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error("getCart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADD TO CART
// ============================================
export const addToCart = async (req, res) => {
  try {
    const { variantId, productType, quantity = 1 } = req.body;

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp variantId",
      });
    }

    if (!productType) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp productType (iPhone, iPad, Mac, AirPods, AppleWatch, Accessory)",
      });
    }

    const models = getModelsByType(productType);
    if (!models) {
      return res.status(400).json({
        success: false,
        message: `productType không hợp lệ: ${productType}`,
      });
    }

    // Lấy variant info
    const variant = await models.Variant.findById(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Biến thể không tồn tại",
      });
    }

    // Kiểm tra product còn tồn tại
    const product = await models.Product.findById(variant.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    // Kiểm tra status
    if (product.status !== "AVAILABLE") {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm hiện không khả dụng",
      });
    }

    // Kiểm tra tồn kho
    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
      });
    }

    const itemData = {
      variantId: variant._id,
      productId: variant.productId,
      productType,
      quantity,
      price: variant.price,
      sku: variant.sku,
    };

    let cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      cart = await Cart.create({ customerId: req.user._id, items: [itemData] });
    } else {
      // Kiểm tra xem variant này đã có trong giỏ chưa
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.variantId.toString() === variantId &&
          item.productType === productType
      );

      if (itemIndex > -1) {
        // Kiểm tra tổng số lượng sau khi cộng
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        if (newQuantity > variant.stock) {
          return res.status(400).json({
            success: false,
            message: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
          });
        }
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].price = variant.price; // Cập nhật giá mới nhất
      } else {
        cart.items.push(itemData);
      }
      await cart.save();
    }

    const formattedItems = await populateCartItems(cart);

    res.json({
      success: true,
      message: "Đã thêm vào giỏ hàng",
      data: {
        _id: cart._id,
        customerId: cart.customerId,
        items: formattedItems,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error("addToCart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// UPDATE CART ITEM
// ============================================
export const updateCartItem = async (req, res) => {
  try {
    const { variantId, productType, quantity } = req.body;

    if (!variantId || !productType) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp variantId và productType",
      });
    }

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng không hợp lệ",
      });
    }

    const models = getModelsByType(productType);
    if (!models) {
      return res.status(400).json({
        success: false,
        message: `productType không hợp lệ: ${productType}`,
      });
    }

    // Kiểm tra variant và stock
    const variant = await models.Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Biến thể không tồn tại",
      });
    }

    if (quantity > 0 && variant.stock < quantity) {
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
      (item) =>
        item.variantId.toString() === variantId &&
        item.productType === productType
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    if (quantity === 0) {
      // Xóa item
      cart.items.splice(itemIndex, 1);
    } else {
      // Cập nhật số lượng và giá
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = variant.price;
    }

    await cart.save();

    const formattedItems = await populateCartItems(cart);

    res.json({
      success: true,
      message: "Cập nhật giỏ hàng thành công",
      data: {
        _id: cart._id,
        customerId: cart.customerId,
        items: formattedItems,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error("updateCartItem error:", error);
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

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item._id && item._id.toString() !== itemId
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    await cart.save();

    const formattedItems = await populateCartItems(cart);

    res.json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
      data: {
        _id: cart._id,
        customerId: cart.customerId,
        items: formattedItems,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error("removeFromCart error:", error);
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

    res.json({
      success: true,
      message: "Đã xóa toàn bộ giỏ hàng",
      data: {
        _id: cart._id,
        customerId: cart.customerId,
        items: [],
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error("clearCart error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// VALIDATE CART
// ============================================
export const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customerId: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    const invalidItems = [];
    const validItems = [];

    for (const item of cart.items) {
      const models = getModelsByType(item.productType);
      if (!models) {
        invalidItems.push({
          itemId: item._id,
          reason: "Loại sản phẩm không hợp lệ",
        });
        continue;
      }

      const variant = await models.Variant.findById(item.variantId);
      if (!variant) {
        invalidItems.push({
          itemId: item._id,
          reason: "Biến thể không tồn tại",
        });
        continue;
      }

      const product = await models.Product.findById(variant.productId);
      if (!product) {
        invalidItems.push({
          itemId: item._id,
          reason: "Sản phẩm không tồn tại",
        });
        continue;
      }

      if (product.status !== "AVAILABLE") {
        invalidItems.push({
          itemId: item._id,
          reason: "Sản phẩm không còn khả dụng",
        });
        continue;
      }

      if (variant.stock < item.quantity) {
        invalidItems.push({
          itemId: item._id,
          reason: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
          availableStock: variant.stock,
        });
        continue;
      }

      validItems.push({
        itemId: item._id,
        variantId: variant._id,
        productId: product._id,
        productType: item.productType,
        quantity: item.quantity,
        price: variant.price,
      });
    }

    res.json({
      success: invalidItems.length === 0,
      message:
        invalidItems.length === 0
          ? "Giỏ hàng hợp lệ"
          : "Có sản phẩm không hợp lệ trong giỏ hàng",
      data: {
        valid: validItems,
        invalid: invalidItems,
      },
    });
  } catch (error) {
    console.error("validateCart error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
};