// ============================================
// FILE: backend/src/controllers/cartController.js
// ✅ UPDATED: Multi-model support for Cart
// ============================================
import Cart from "./Cart.js";
import UniversalProduct, { UniversalVariant } from "../product/UniversalProduct.js";

// Helper: Lay Model va Variant Model dua tren productType
const getModelsByType = (productType) => {
  // ✅ UPDATED: All products now use UniversalProduct
  return { Product: UniversalProduct, Variant: UniversalVariant };
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
// GET CART COUNT (distinct items)
// ============================================
export const getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customerId: req.user._id }).select("items");
    const count = Array.isArray(cart?.items) ? cart.items.length : 0;

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("getCartCount error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// ADD TO CART
// ============================================
export const addToCart = async (req, res) => {
  console.log("cartController.addToCart → Request body:", req.body);
  console.log("cartController.addToCart → User ID:", req.user?._id);

  try {
    const { variantId, productType, quantity = 1 } = req.body;

    console.log("Extracted:", { variantId, productType, quantity });

    if (!variantId) {
      console.warn("Missing variantId");
      return res
        .status(400)
        .json({ success: false, message: "Cần cung cấp variantId" });
    }

    if (!productType) {
      console.warn("Missing productType");
      return res
        .status(400)
        .json({ success: false, message: "Cần cung cấp productType" });
    }

    const models = getModelsByType(productType);
    if (!models) {
      console.warn("Invalid productType:", productType);
      return res.status(400).json({
        success: false,
        message: `productType không hợp lệ: ${productType}`,
      });
    }

    console.log("Using models:", {
      Product: models.Product.name,
      Variant: models.Variant.name,
    });

    const variant = await models.Variant.findById(variantId).lean();
    console.log(
      "Found variant:",
      variant
        ? { _id: variant._id, sku: variant.sku, productId: variant.productId }
        : null
    );

    if (!variant) {
      console.warn("Variant not found:", variantId);
      return res
        .status(404)
        .json({ success: false, message: "Biến thể không tồn tại" });
    }

    const product = await models.Product.findById(variant.productId).lean();
    console.log(
      "Found product:",
      product ? { _id: product._id, name: product.name } : null
    );

    if (!product) {
      console.warn("Product not found:", variant.productId);
      return res
        .status(404)
        .json({ success: false, message: "Sản phẩm không tồn tại" });
    }

    if (product.status !== "AVAILABLE") {
      console.warn("Product not available:", product.status);
      return res
        .status(400)
        .json({ success: false, message: "Sản phẩm hiện không khả dụng" });
    }

    if (variant.stock < quantity) {
      console.warn("Out of stock:", {
        stock: variant.stock,
        requested: quantity,
      });
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
    console.log("Prepared itemData:", itemData);

    let cart = await Cart.findOne({ customerId: req.user._id });
    console.log(
      "Existing cart:",
      cart ? { _id: cart._id, itemsCount: cart.items.length } : "Not found"
    );

    if (!cart) {
      console.log("Creating new cart for user:", req.user._id);
      cart = await Cart.create({ customerId: req.user._id, items: [itemData] });
    } else {
      console.log(
        "Checking for existing item in cart.items:",
        cart.items.map((i) => ({
          variantId: i.variantId?.toString(),
          productType: i.productType,
          _id: i._id?.toString(),
        }))
      );

      const itemIndex = cart.items.findIndex((item) => {
        if (!item.variantId || !item.productType) {
          console.warn("Invalid item in updateCartItem:", item);
          return false;
        }
        return (
          item.variantId.toString() === variantId.toString() &&
          item.productType === productType
        );
      });

      if (itemIndex > -1) {
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        console.log("Updating existing item:", {
          oldQty: cart.items[itemIndex].quantity,
          newQty: newQuantity,
        });
        if (newQuantity > variant.stock) {
          console.warn("Not enough stock after update");
          return res.status(400).json({
            success: false,
            message: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
          });
        }
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].price = variant.price;
      } else {
        console.log("Adding new item to cart");
        cart.items.push(itemData);
      }
      await cart.save();
      console.log("Cart saved:", {
        _id: cart._id,
        itemsCount: cart.items.length,
      });
    }

    const formattedItems = await populateCartItems(cart);
    console.log("Final formatted items count:", formattedItems.length);

    res.json({
      success: true,
      message: "Đã thêm vào giỏ hàng",
      data: {
        _id: cart._id,
        items: formattedItems,
      },
    });
  } catch (error) {
    console.error("cartController.addToCart → CRASH:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
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
// REMOVE FROM CART - ĐÃ SỬA
// ============================================
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    console.log("🗑️ Removing cart item:", {
      itemId,
      userId: req.user._id,
    });

    const cart = await Cart.findOne({ customerId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Giỏ hàng không tồn tại",
      });
    }

    const initialLength = cart.items.length;

    // ✅ Filter by comparing both _id and variantId
    cart.items = cart.items.filter((item) => {
      const itemIdStr = item._id ? item._id.toString() : null;
      const variantIdStr = item.variantId ? item.variantId.toString() : null;

      // Keep items that don't match the itemId
      return itemIdStr !== itemId && variantIdStr !== itemId;
    });

    if (cart.items.length === initialLength) {
      console.log("❌ Item not found in cart:", itemId);
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    console.log("✅ Item removed. Items left:", cart.items.length);
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
  getCartCount,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
};

