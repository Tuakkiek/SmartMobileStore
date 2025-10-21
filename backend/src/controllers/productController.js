// ============================================
// FILE: controllers/productController.js
// ✅ COMBINED: Cũ + Mới - Variants với BỘ ẢNH
// ============================================

import Product from "../models/Product.js";
import Variant from "../models/Variant.js";

// [Existing functions remain unchanged...]

// Get variants by product ID
export const getVariantsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const variants = await Variant.find({ productId }).populate(
      "productId",
      "name model"
    );

    if (!variants.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biến thể cho sản phẩm này",
      });
    }

    res.json({
      success: true,
      data: { variants },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get variant by ID
export const getVariantById = async (req, res) => {
  try {
    const { variantId } = req.params;
    const variant = await Variant.findById(variantId).populate(
      "productId",
      "name model"
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biến thể",
      });
    }

    res.json({
      success: true,
      data: { variant },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new variant
export const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    const variantData = {
      ...req.body,
      productId,
      stock: req.body.stock || 0,
    };

    const variant = await Variant.create(variantData);

    product.variants.push(variant._id);
    await product.save();

    res.status(201).json({
      success: true,
      message: "Tạo biến thể thành công",
      data: { variant },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a variant
export const updateVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const updateData = req.body;

    const variant = await Variant.findByIdAndUpdate(
      variantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biến thể",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật biến thể thành công",
      data: { variant },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a variant
export const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const variant = await Variant.findById(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy biến thể",
      });
    }

    await Product.updateOne(
      { _id: variant.productId },
      { $pull: { variants: variantId } }
    );

    await Variant.findByIdAndDelete(variantId);

    res.json({
      success: true,
      message: "Xóa biến thể thành công",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all categories with product counts
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          subcategories: { $addToSet: "$subcategory" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all products with enhanced filtering - GROUP BY PRODUCT + MIN PRICE FROM VARIANTS
export const getAllProducts = async (req, res) => {
  try {
    console.log("Query params:", req.query);

    const {
      page = 1,
      limit = 12,
      search,
      category,
      subcategory,
      status,
      condition,
      minPrice,
      maxPrice,
      sort,
      tags,
      inStock,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive number",
      });
    }
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive number",
      });
    }

    let pipeline = [
      // Join với variants
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      // Tính min price từ variants hoặc dùng price gốc
      {
        $addFields: {
          displayPrice: {
            $cond: {
              if: { $eq: [{ $size: "$variants" }, 0] },
              then: { $ifNull: ["$price", 0] },
              else: {
                $min: [
                  { $ifNull: ["$price", Infinity] },
                  { $ifNull: [{ $min: "$variants.price" }, Infinity] },
                ],
              },
            },
          },
        },
      },
      // Filter cơ bản
      {
        $match: {
          ...(category && { category: category }),
          ...(subcategory && { subcategory: subcategory }),
          ...(condition && { condition: condition }),
          ...(status && { status: status }),
          ...(inStock === "true" && {
            $or: [{ quantity: { $gt: 0 } }, { "variants.stock": { $gt: 0 } }],
          }),
          ...(minPrice && { displayPrice: { $gte: Number(minPrice) } }),
          ...(maxPrice && { displayPrice: { $lte: Number(maxPrice) } }),
          ...(tags && { tags: { $in: tags.split(",") } }),
        },
      },
      // Search
      ...(search && [
        {
          $match: {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { model: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          },
        },
      ]),
      // Project fields
      {
        $project: {
          name: 1,
          model: 1,
          category: 1,
          subcategory: 1,
          condition: 1,
          displayPrice: 1,
          originalPrice: 1,
          discount: 1,
          status: 1,
          quantity: 1,
          images: 1,
          averageRating: 1,
          totalReviews: 1,
          createdAt: 1,
          variantsCount: { $size: "$variants" },
        },
      },
      // Sort
      {
        $sort:
          sort === "price-asc"
            ? { displayPrice: 1 }
            : sort === "price-desc"
            ? { displayPrice: -1 }
            : sort === "rating"
            ? { averageRating: -1 }
            : sort === "name"
            ? { name: 1 }
            : sort === "popularity"
            ? { totalReviews: -1 }
            : { createdAt: -1 },
      },
      // Pagination
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ];

    const products = await Product.aggregate(pipeline);
    const countPipeline = pipeline.filter(
      (p) =>
        !["$skip", "$limit"].includes(
          p.$skip?.toString() || p.$limit?.toString()
        )
    );
    const count = await Product.aggregate([
      ...countPipeline,
      { $count: "total" },
    ]);

    console.log("Products fetched:", products.length);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil((count[0]?.total || 0) / limitNum),
        currentPage: pageNum,
        total: count[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Bad request",
    });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 12,
      subcategory,
      condition,
      sort = "createdAt",
    } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          displayPrice: {
            $min: ["$price", { $min: "$variants.price" }],
          },
        },
      },
      {
        $match: {
          category,
          ...(subcategory && { subcategory }),
          ...(condition && { condition }),
        },
      },
      {
        $project: {
          name: 1,
          model: 1,
          category: 1,
          subcategory: 1,
          condition: 1,
          displayPrice: 1,
          images: 1,
          averageRating: 1,
          variantsCount: { $size: "$variants" },
        },
      },
      {
        $sort:
          sort === "price-asc"
            ? { displayPrice: 1 }
            : sort === "price-desc"
            ? { displayPrice: -1 }
            : sort === "rating"
            ? { averageRating: -1 }
            : { createdAt: -1 },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 },
    ];

    const products = await Product.aggregate(pipeline);
    const count = await Product.countDocuments({
      category,
      ...(subcategory && { subcategory }),
      ...(condition && { condition }),
    });

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
        total: count,
        category,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const { category, condition, limit = 8 } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          displayPrice: { $min: ["$price", { $min: "$variants.price" }] },
        },
      },
      {
        $match: {
          status: "AVAILABLE",
          ...(category && { category }),
          ...(condition && { condition }),
        },
      },
      { $sort: { averageRating: -1, totalReviews: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          name: 1,
          model: 1,
          category: 1,
          displayPrice: 1,
          images: 1,
          averageRating: 1,
        },
      },
    ];

    const products = await Product.aggregate(pipeline);

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get new arrivals
export const getNewArrivals = async (req, res) => {
  try {
    const { category, condition, limit = 8 } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          displayPrice: { $min: ["$price", { $min: "$variants.price" }] },
        },
      },
      {
        $match: {
          status: { $in: ["AVAILABLE", "PRE_ORDER"] },
          ...(category && { category }),
          ...(condition && { condition }),
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          name: 1,
          model: 1,
          category: 1,
          displayPrice: 1,
          images: 1,
        },
      },
    ];

    const products = await Product.aggregate(pipeline);

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("createdBy", "fullName")
      .populate({
        path: "variants",
        populate: {
          path: "productId",
          select: "name model images",
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    const variants = product.variants || [];
    const minVariantPrice =
      variants.length > 0
        ? Math.min(...variants.map((v) => v.price))
        : product.price;

    res.json({
      success: true,
      data: {
        product: { ...product.toObject(), displayPrice: minVariantPrice },
        variants,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get related products
export const getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    const pipeline = [
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          displayPrice: { $min: ["$price", { $min: "$variants.price" }] },
        },
      },
      {
        $match: {
          _id: { $ne: product._id },
          category: product.category,
          condition: product.condition,
          status: "AVAILABLE",
        },
      },
      { $limit: 4 },
      { $sort: { averageRating: -1 } },
      {
        $project: {
          name: 1,
          model: 1,
          category: 1,
          displayPrice: 1,
          images: 1,
          averageRating: 1,
        },
      },
    ];

    const products = await Product.aggregate(pipeline);

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const validateSpecsByCategory = (category, specs) => {
  const requiredFields = {
    iPhone: [
      "chip",
      "ram",
      "storage",
      "screenSize",
      "screenTech",
      "battery",
      "os",
      "resolution",
      "ports",
    ],
    iPad: [
      "chip",
      "ram",
      "storage",
      "screenSize",
      "screenTech",
      "battery",
      "os",
      "resolution",
      "ports",
    ],
    Mac: [
      "chip",
      "gpuType",
      "ram",
      "storage",
      "screenSize",
      "screenTech",
      "battery",
      "os",
      "resolution",
      "cpuType",
      "ports",
    ],
    AirPods: [
      "chipset",
      "brand",
      "audioTech",
      "batteryLife",
      "controls",
      "mic",
      "connectors",
      "otherFeatures",
    ],
    "Apple Watch": [
      "chip",
      "ram",
      "storage",
      "screenSize",
      "screenTech",
      "battery",
      "os",
      "resolution",
      "ports",
    ], // Assuming similar to iPhone
    "Phụ kiện": [], // No required; uses customSpecs
  };

  const reqFields = requiredFields[category] || [];
  for (const field of reqFields) {
    if (!specs[field]) {
      throw new Error(
        `Missing required spec field: ${field} for category ${category}`
      );
    }
  }
  return true;
};

// ✅ COMBINED: CREATE PRODUCT - Với BỘ ẢNH VARIANTS
export const createProduct = async (req, res) => {
  try {
    const { variants: variantsData, ...productData } = req.body;

    // Validate specs based on category
    validateSpecsByCategory(productData.category, productData.specifications);

    const product = await Product.create({
      ...productData,
      condition: productData.condition || "NEW",
      createdBy: req.user._id,
      specifications:
        productData.category === "Phụ kiện"
          ? {
              customSpecs: productData.specifications?.customSpecs || [
                { key: "", value: "" },
              ],
            }
          : productData.specifications || {},
      variants: [],
    });

    if (
      variantsData &&
      Array.isArray(variantsData) &&
      variantsData.length > 0
    ) {
      const createdVariants = [];
      for (const variantGroup of variantsData) {
        const { color, images, options } = variantGroup;
        if (!color || !options || options.length === 0) continue;

        for (const option of options) {
          const variantDoc = await Variant.create({
            productId: product._id,
            color,
            images: Array.isArray(images) ? images : [],
            attributes: {
              storage: option.storage,
              ram: option.ram,
              cpuGpu: option.cpuGpu,
              version: option.version,
            },
            price: Number(option.price || 0),
            originalPrice: Number(option.originalPrice || 0),
            stock: Number(option.quantity || 0),
            sku: `${product._id}-${color}-${Object.values({storage: option.storage, ram: option.ram, cpuGpu: option.cpuGpu, version: option.version}).filter(Boolean).join('-') || "default"}`.toUpperCase(),
          });
          createdVariants.push(variantDoc._id);
        }
      }
      product.variants = createdVariants;
      await product.save();
    }

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: { product },
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ COMBINED: UPDATE PRODUCT - Với BỘ ẢNH VARIANTS
export const updateProduct = async (req, res) => {
  try {
    const { variants: variantsData, ...productData } = req.body;

    // Validate specs based on category
    validateSpecsByCategory(productData.category, productData.specifications);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...productData,
        condition: productData.condition || "NEW",
        specifications:
          productData.category === "Phụ kiện"
            ? {
                customSpecs: productData.specifications?.customSpecs || [
                  { key: "", value: "" },
                ],
              }
            : productData.specifications || {},
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    if (variantsData && Array.isArray(variantsData)) {
      await Variant.deleteMany({ productId: product._id });
      const createdVariants = [];
      for (const variantGroup of variantsData) {
        const { color, images, options } = variantGroup;
        if (!color || !options || options.length === 0) continue;

        for (const option of options) {
          const variantDoc = await Variant.create({
            productId: product._id,
            color,
            images: Array.isArray(images) ? images : [],
            storage: option.storage || "",
            ram: option.ram || "",
            cpuGpu: option.cpuGpu || "",
            price: Number(option.price || 0),
            originalPrice: Number(option.originalPrice || 0),
            stock: Number(option.quantity || 0),
            sku: `${product._id}-${color}-${option.storage || "default"}-${
              option.ram || "default"
            }`.toUpperCase(),
          });
          createdVariants.push(variantDoc._id);
        }
      }
      product.variants = createdVariants;
      await product.save();
    }

    res.json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: { product },
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    await Variant.deleteMany({ productId: req.params.id });
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      message: "Xóa sản phẩm thành công",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSpecificVariant = async (req, res) => {
  try {
    const { productId, color, storage, ram, cpuGpu, version } = req.query;
    if (!productId || !color) {
    return res
    .status(400)
    .json({
    success: false,
    message: "Cần cung cấp productId và color",
    });
    }

    const match = { productId, color };
if (storage) match["attributes.storage"] = storage;
if (ram) match["attributes.ram"] = ram;
if (cpuGpu) match["attributes.cpuGpu"] = cpuGpu;
if (version) match["attributes.version"] = version;
const variant = await Variant.findOne(match);
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy biến thể" });
    }

    res.json({
      success: true,
      data: variant,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// Update quantity
export const updateQuantity = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (variantId) {
      const variant = await Variant.findByIdAndUpdate(
        variantId,
        { stock: quantity },
        { new: true }
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy biến thể",
        });
      }

      res.json({
        success: true,
        message: "Cập nhật tồn kho biến thể thành công",
        data: { variant },
      });
    } else {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { quantity },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      res.json({
        success: true,
        message: "Cập nhật số lượng thành công",
        data: { product },
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk update products
export const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updateData } = req.body;

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { ...updateData, condition: updateData.condition || "NEW" } }
    );

    res.json({
      success: true,
      message: `Đã cập nhật ${result.modifiedCount} sản phẩm`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get product statistics by category
export const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $group: {
          _id: {
            category: "$category",
            condition: "$condition",
          },
          totalProducts: { $sum: 1 },
          availableProducts: {
            $sum: { $cond: [{ $eq: ["$status", "AVAILABLE"] }, 1, 0] },
          },
          totalQuantity: { $sum: "$quantity" },
          variantQuantity: { $sum: { $sum: "$variants.stock" } },
          averagePrice: { $avg: "$price" },
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        },
      },
      {
        $sort: { "_id.category": 1, "_id.condition": 1 },
      },
    ]);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk import JSON
export const bulkImportJSON = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and must not be empty",
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const productData of products) {
      try {
        const product = await Product.create({
          ...productData,
          condition: productData.condition || "NEW",
          createdBy: req.user._id,
          variants: [], // Empty variants
        });
        results.success.push({
          name: product.name,
          id: product._id,
          condition: product.condition,
        });
      } catch (error) {
        results.failed.push({
          name: productData.name || "Unknown",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Imported ${results.success.length} products successfully, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk import CSV
export const bulkImportCSV = async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV data is required and must not be empty",
      });
    }

    const results = { success: [], failed: [] };

    for (const row of csvData) {
      try {
        const specifications = {};
        if (row.spec_color) specifications.color = row.spec_color;
        if (row.spec_storage) specifications.storage = row.spec_storage;
        if (row.spec_ram) specifications.ram = row.spec_ram;

        const images = row.images
          ? row.images
              .split(",")
              .map((img) => img.trim())
              .filter(Boolean)
          : [];
        const tags = row.tags
          ? row.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [];
        const features = row.features
          ? row.features
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : [];

        const productData = {
          name: row.name,
          category: row.category,
          subcategory: row.subcategory || "",
          model: row.model,
          condition: row.condition || "NEW",
          specifications,
          price: Number(row.price),
          originalPrice: Number(row.originalPrice),
          discount: Number(row.discount || 0),
          quantity: Number(row.quantity),
          status: row.status || "AVAILABLE",
          images,
          description: row.description || "",
          features,
          tags,
          createdBy: req.user._id,
          variants: [], // Empty variants
        };

        const product = await Product.create(productData);
        results.success.push({
          name: product.name,
          id: product._id,
          condition: product.condition,
        });
      } catch (error) {
        results.failed.push({
          name: row.name || "Unknown",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Imported ${results.success.length} products successfully, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Export to CSV
export const exportToCSV = async (req, res) => {
  try {
    const { category, status, condition } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (condition) query.condition = condition;

    const products = await Product.find(query).populate("variants").lean();

    const csvData = products.map((product) => ({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      model: product.model,
      condition: product.condition,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount || 0,
      quantity: product.quantity,
      status: product.status,
      images: (product.images || []).join(","),
      description: product.description || "",
      tags: (product.tags || []).join(","),
      features: (product.features || []).join(","),
      variants: JSON.stringify(
        product.variants?.map((v) => ({
          color: v.color,
          images: (v.images || []).join(","),
          storage: v.storage,
          ram: v.ram,
          cpuGpu: v.cpuGpu,
          price: v.price,
          stock: v.stock,
          sku: v.sku,
        })) || []
      ),
    }));

    res.json({
      success: true,
      data: csvData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
