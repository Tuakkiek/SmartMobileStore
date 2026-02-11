import mongoose from "mongoose";
import IPhone from "../product/IPhone.js";
import IPad from "../product/IPad.js";
import Mac from "../product/Mac.js";
import AirPods from "../product/AirPods.js";
import AppleWatch from "../product/AppleWatch.js";
import Accessory from "../product/Accessory.js";

const PRODUCT_MODELS = {
  iPhone: IPhone,
  iPad: IPad,
  Mac: Mac,
  AirPods: AirPods,
  AppleWatch: AppleWatch,
  Accessory: Accessory,
};

const findProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  for (const [category, Model] of Object.entries(PRODUCT_MODELS)) {
    const product = await Model.findById(id);
    if (product) {
      return product;
    }
  }
  return null;
};

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
      iPad: "ipadvariant", // Note: Check consistency of collection names in DB vs Model
      Mac: "macvariant",
      AirPods: "airpodsvariant",
      AppleWatch: "applewatchvariant",
      Accessory: "accessoryvariant",
    };

    // Fallback if not mapped explicitly
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

export default {
  getRelatedProducts
};
