// backend/src/controllers/appleWatchController.js
import mongoose from "mongoose";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";

export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 CREATE REQUEST:", JSON.stringify(req.body, null, 2));

    const { createVariants, variants, ...productData } = req.body;

    // ✅ 1. VALIDATE REQUIRED FIELDS
    if (!productData.name || !productData.model) {
      throw new Error("Tên và Model là bắt buộc");
    }

    if (!productData.createdBy) {
      throw new Error("createdBy là bắt buộc");
    }

    if (!productData.specifications) {
      throw new Error("Thông số kỹ thuật là bắt buộc");
    }

    // Ensure colors is array
    if (!Array.isArray(productData.specifications.colors)) {
      productData.specifications.colors = productData.specifications.colors
        ? [productData.specifications.colors]
        : [];
    }

    // ✅ 2. CREATE MAIN PRODUCT (without variants first)
    const productToCreate = {
      name: productData.name.trim(),
      model: productData.model.trim(),
      category: productData.category?.trim() || "Unknown",
      description: productData.description?.trim() || "",
      specifications: productData.specifications,
      variants: [], // Will be populated after creating variants
      status: productData.status || "AVAILABLE",
      createdBy: productData.createdBy,
      averageRating: 0,
      totalReviews: 0,
    };

    const product = new AppleWatch(productToCreate);
    await product.save({ session });

    console.log("✅ Product created:", product._id);

    // ✅ 3. HANDLE VARIANTS
    const variantsToCreate = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantsToCreate.length > 0) {
      console.log(`📦 Processing ${variantsToCreate.length} variant groups...`);

      for (const variantGroup of variantsToCreate) {
        const { color, images, options } = variantGroup;

        // Validate variant group
        if (!color || !color.trim()) {
          console.warn("⚠️ Skipping variant: missing color");
          continue;
        }

        if (!Array.isArray(options) || options.length === 0) {
          console.warn(`⚠️ Skipping variant ${color}: no options`);
          continue;
        }

        console.log(
          `  📝 Processing color: ${color} (${options.length} options)`
        );

        // Create ONE variant per option
        for (const option of options) {
          // Validate option
          if (!option.variantName || !option.sku) {
            console.warn(
              `    ⚠️ Skipping option: missing variantName or sku`,
              option
            );
            continue;
          }

          // Create variant document
          const variantDoc = new AppleWatchVariant({
            color: color.trim(),
            variantName: option.variantName.trim(),
            originalPrice: Number(option.originalPrice) || 0,
            price: Number(option.price) || 0,
            stock: Number(option.stock) || 0,
            images: Array.isArray(images)
              ? images.filter((img) => img && img.trim())
              : [],
            sku: option.sku.trim(),
            productId: product._id,
          });

          try {
            await variantDoc.save({ session });
            createdVariantIds.push(variantDoc._id);
            console.log(
              `    ✅ Created: ${variantDoc.sku} (${variantDoc.color} - ${variantDoc.variantName})`
            );
          } catch (variantError) {
            if (variantError.code === 11000) {
              console.error(`    ❌ Duplicate SKU: ${option.sku}`);
              throw new Error(`SKU đã tồn tại: ${option.sku}`);
            }
            throw variantError;
          }
        }
      }

      // ✅ 4. UPDATE PRODUCT WITH VARIANT IDs
      product.variants = createdVariantIds;

      // Auto-populate specifications from variants
      const allColors = [
        ...new Set(variantsToCreate.map((v) => v.color.trim())),
      ];

      product.specifications.colors = allColors;

      await product.save({ session });

      console.log(
        `✅ Product updated with ${createdVariantIds.length} variant IDs`
      );
    } else {
      console.log("⚠️ No variants provided");
    }

    // ✅ 5. COMMIT & RETURN
    await session.commitTransaction();

    // Fetch populated product
    const populatedProduct = await AppleWatch.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    console.log("✅ Transaction committed successfully");

    res.status(201).json({
      success: true,
      message: "Tạo Apple Watch thành công",
      data: { product: populatedProduct },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ CREATE ERROR:", error.message);
    console.error("❌ Stack:", error.stack);

    // Handle specific errors
    if (error.code === 11000) {
      const duplicateKey = Object.keys(error.keyValue || {})[0];
      return res.status(400).json({
        success: false,
        message: `Trường ${duplicateKey} đã tồn tại: ${error.keyValue[duplicateKey]}`,
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 UPDATE REQUEST:", req.params.id);
    console.log("📥 UPDATE BODY:", JSON.stringify(req.body, null, 2));

    const { createVariants, variants, ...productData } = req.body;

    // ✅ 1. FIND & UPDATE PRODUCT
    const product = await AppleWatch.findById(req.params.id).session(session);

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // Update main fields
    if (productData.name) product.name = productData.name.trim();
    if (productData.model) product.model = productData.model.trim();
    if (productData.description !== undefined)
      product.description = productData.description?.trim() || "";
    if (productData.status) product.status = productData.status;
    if (productData.specifications) {
      // Ensure colors is array
      if (
        productData.specifications.colors &&
        !Array.isArray(productData.specifications.colors)
      ) {
        productData.specifications.colors = [productData.specifications.colors];
      }
      product.specifications = productData.specifications;
    }

    await product.save({ session });
    console.log("✅ Product basic info updated");

    // ✅ 2. HANDLE VARIANTS UPDATE
    const variantsToUpdate = createVariants || variants;

    if (
      variantsToUpdate &&
      Array.isArray(variantsToUpdate) &&
      variantsToUpdate.length > 0
    ) {
      console.log(`📦 Updating variants...`);

      // Delete old variants
      const deleteResult = await AppleWatchVariant.deleteMany(
        { productId: product._id },
        { session }
      );
      console.log(`  🗑️ Deleted ${deleteResult.deletedCount} old variants`);

      const createdVariantIds = [];

      // Create new variants
      for (const variantGroup of variantsToUpdate) {
        const { color, images, options } = variantGroup;

        if (!color || !color.trim()) {
          console.warn("⚠️ Skipping variant: missing color");
          continue;
        }

        if (!Array.isArray(options) || options.length === 0) {
          console.warn(`⚠️ Skipping variant ${color}: no options`);
          continue;
        }

        console.log(
          `  📝 Processing color: ${color} (${options.length} options)`
        );

        for (const option of options) {
          if (!option.variantName || !option.sku) {
            console.warn(
              `    ⚠️ Skipping option: missing variantName or sku`,
              option
            );
            continue;
          }

          const variantDoc = new AppleWatchVariant({
            color: color.trim(),
            variantName: option.variantName.trim(),
            originalPrice: Number(option.originalPrice) || 0,
            price: Number(option.price) || 0,
            stock: Number(option.stock) || 0,
            images: Array.isArray(images)
              ? images.filter((img) => img && img.trim())
              : [],
            sku: option.sku.trim(),
            productId: product._id,
          });

          try {
            await variantDoc.save({ session });
            createdVariantIds.push(variantDoc._id);
            console.log(`    ✅ Created: ${variantDoc.sku}`);
          } catch (variantError) {
            if (variantError.code === 11000) {
              console.error(`    ❌ Duplicate SKU: ${option.sku}`);
              throw new Error(`SKU đã tồn tại: ${option.sku}`);
            }
            throw variantError;
          }
        }
      }

      // Update product with new variant IDs
      product.variants = createdVariantIds;

      // Auto-update specifications
      const allColors = [
        ...new Set(variantsToUpdate.map((v) => v.color.trim())),
      ];

      product.specifications.colors = allColors;

      await product.save({ session });
      console.log(
        `✅ Product updated with ${createdVariantIds.length} new variants`
      );
    }

    // ✅ 3. COMMIT & RETURN
    await session.commitTransaction();

    const populatedProduct = await AppleWatch.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    console.log("✅ Update transaction committed");

    res.json({
      success: true,
      message: "Cập nhật Apple Watch thành công",
      data: { product: populatedProduct },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ UPDATE ERROR:", error.message);
    console.error("❌ Stack:", error.stack);

    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

export const findAll = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const products = await AppleWatch.find(query)
      .populate("variants")
      .populate("createdBy", "fullName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await AppleWatch.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
        total: count,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const findOne = async (req, res) => {
  try {
    const product = await AppleWatch.findById(req.params.id)
      .populate("variants")
      .populate("createdBy", "fullName");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy Apple Watch",
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAppleWatch = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await AppleWatch.findById(req.params.id).session(session);

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // Delete all variants
    const deleteResult = await AppleWatchVariant.deleteMany(
      { productId: product._id },
      { session }
    );
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} variants`);

    // Delete product
    await product.deleteOne({ session });
    console.log(`🗑️ Deleted product: ${product._id}`);

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Xóa Apple Watch thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ DELETE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const getVariants = async (req, res) => {
  try {
    const variants = await AppleWatchVariant.find({
      productId: req.params.id,
    });

    res.json({
      success: true,
      data: { variants },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
