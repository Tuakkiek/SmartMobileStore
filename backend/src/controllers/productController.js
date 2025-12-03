// ============================================
// FILE: controllers/productController.js
// ✅ SIMPLIFIED: Only getRelatedProducts used
// ============================================

import { findProductById, PRODUCT_MODELS } from "../models/Product.js";

// Get related products
export const getRelatedProducts = async (req, res) => {
  try {
    const product = await findProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Get the correct model for this product's category
    const Model = PRODUCT_MODELS[product.category];
    if (!Model) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục sản phẩm",
      });
    }

    // Get collection name for variants based on category
    const variantCollectionMap = {
      iPhone: "iphonevariants",
      iPad: "ipadvariant",
      Mac: "macvariant",
      AirPods: "airpodsvariant",
      AppleWatch: "applewatchvariant",
      Accessory: "accessoryvariant",
    };

    const variantCollection = variantCollectionMap[product.category] || `${product.category.toLowerCase()}variants`;

    const pipeline = [
      {
        $match: {
          _id: { $ne: product._id },
          category: product.category,
          condition: product.condition,
          status: "AVAILABLE",
        },
      },
      {
        $lookup: {
          from: variantCollection,
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      { $limit: 4 },
      { $sort: { averageRating: -1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          model: 1,
          category: 1,
          images: 1,
          price: 1,
          originalPrice: 1,
          averageRating: 1,
          totalReviews: 1,
          variants: 1,
          baseSlug: 1,
          installmentBadge: 1,
        },
      },
    ];

    const products = await Model.aggregate(pipeline);

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    console.error("Error getting related products:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Stub functions for backwards compatibility (not implemented)
export const getVariantsByProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getVariantById = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const createVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const updateVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const deleteVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getCategories = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getAllProducts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getProductsByCategory = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getFeaturedProducts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getNewArrivals = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getProductById = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const createProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const updateProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const deleteProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getSpecificVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const updateQuantity = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const bulkUpdateProducts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getProductStats = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const bulkImportJSON = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const bulkImportCSV = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const exportToCSV = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export default {
  getRelatedProducts,
  getVariantsByProduct,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  getCategories,
  getAllProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSpecificVariant,
  updateQuantity,
  bulkUpdateProducts,
  getProductStats,
  bulkImportJSON,
  bulkImportCSV,
  exportToCSV,
};
