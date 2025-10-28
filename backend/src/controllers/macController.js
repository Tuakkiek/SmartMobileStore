import mongoose from "mongoose";
import Mac, { MacVariant } from "../models/Mac.js";

// Helper to create slug
const createSlug = (str) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

// ============================================
// CREATE Mac with variants
// ============================================
export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 CREATE REQUEST:", JSON.stringify(req.body, null, 2));

    const { createVariants, variants, ...productData } = req.body;

    // ✅ 1. VALIDATE REQUIRED FIELDS
    if (!productData.name || !productData.name.trim()) {
      throw new Error("Tên là bắt buộc");
    }

    if (!productData.model || !productData.model.trim()) {
      throw new Error("Model là bắt buộc");
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
      category: productData.category?.trim() || "Mac", // ✅ thêm dòng này
      description: productData.description?.trim() || "",
      specifications: productData.specifications,
      variants: [],
      status: productData.status || "AVAILABLE",
      createdBy: productData.createdBy,
      averageRating: 0,
      totalReviews: 0,
    };

    const product = new Mac(productToCreate);
    await product.save({ session });

    // ✅ Generate slug
    product.slug = createSlug(product.model);
    await product.save({ session });

    console.log("✅ Product created with slug:", product.slug);

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
          if (!option.cpuGpu || !option.ram || !option.storage || !option.sku) {
            console.warn(
              `    ⚠️ Skipping option: missing cpuGpu, ram, storage, or sku`,
              option
            );
            continue;
          }

          // Create variant document
          const variantDoc = new MacVariant({
            color: color.trim(),
            cpuGpu: option.cpuGpu.trim(),
            ram: option.ram.trim(),
            storage: option.storage.trim(),
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
              `    ✅ Created: ${variantDoc.sku} (${variantDoc.color} - ${variantDoc.cpuGpu} - ${variantDoc.ram} - ${variantDoc.storage})`
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
      const allStorages = variantsToCreate
        .flatMap((v) => v.options.map((o) => o.storage.trim()))
        .filter(Boolean);
      const uniqueStorages = [...new Set(allStorages)].sort((a, b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        return aNum - bNum;
      });

      product.specifications.colors = allColors;
      product.specifications.storage = uniqueStorages.join(" / ");

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
    const populatedProduct = await Mac.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    console.log("✅ Transaction committed successfully");

    res.status(201).json({
      success: true,
      message: "Tạo Mac thành công",
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

// ============================================
// UPDATE Mac
// ============================================
export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 UPDATE REQUEST:", req.params.id);
    console.log("📥 UPDATE BODY:", JSON.stringify(req.body, null, 2));

    const { createVariants, variants, ...productData } = req.body;

    // ✅ 1. FIND & UPDATE PRODUCT
    const product = await Mac.findById(req.params.id).session(session);

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // Update main fields
    let slugChanged = false;
    if (productData.name) product.name = productData.name.trim();
    if (productData.model) {
      const newModel = productData.model.trim();
      if (newModel !== product.model) {
        product.model = newModel;
        product.slug = createSlug(newModel);
        slugChanged = true;
      }
    }
    if (productData.description !== undefined)
      product.description = productData.description?.trim() || "";
    if (productData.condition) product.condition = productData.condition;
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
    if (slugChanged) {
      console.log("✅ Slug updated to:", product.slug);
    }
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
      const deleteResult = await MacVariant.deleteMany(
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
          if (!option.cpuGpu || !option.ram || !option.storage || !option.sku) {
            console.warn(
              `    ⚠️ Skipping option: missing cpuGpu, ram, storage, or sku`,
              option
            );
            continue;
          }

          const variantDoc = new MacVariant({
            color: color.trim(),
            cpuGpu: option.cpuGpu.trim(),
            ram: option.ram.trim(),
            storage: option.storage.trim(),
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
      const allStorages = variantsToUpdate
        .flatMap((v) => v.options.map((o) => o.storage.trim()))
        .filter(Boolean);
      const uniqueStorages = [...new Set(allStorages)].sort((a, b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        return aNum - bNum;
      });

      product.specifications.colors = allColors;
      product.specifications.storage = uniqueStorages.join(" / ");

      await product.save({ session });
      console.log(
        `✅ Product updated with ${createdVariantIds.length} new variants`
      );
    }

    // ✅ 3. COMMIT & RETURN
    await session.commitTransaction();

    const populatedProduct = await Mac.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    console.log("✅ Update transaction committed");

    res.json({
      success: true,
      message: "Cập nhật Mac thành công",
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

// ============================================
// GET Mac by Slug and Storage (NEW for URL structure)
// Note: For Mac, additional filters like ram/cpuGpu can be in query if needed
// ============================================
export const getProductDetail = async (req, res) => {
  try {
    const { modelSlug, storage } = req.params;
    const sku = req.query.sku?.trim();
    const ram = req.query.ram?.trim(); // Optional
    const cpuGpu = req.query.cpuGpu?.trim(); // Optional

    // Find product by slug
    const product = await Mac.findOne({ slug: modelSlug })
      .populate("variants")
      .populate("createdBy", "fullName email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sản phẩm với slug: ${modelSlug}`,
      });
    }

    // Filter variants by storage (and ram/cpuGpu if provided)
    let matchingVariants = product.variants.filter(
      (v) => v.storage.toLowerCase() === storage.toLowerCase()
    );

    if (ram) {
      matchingVariants = matchingVariants.filter(
        (v) => v.ram.toLowerCase() === ram.toLowerCase()
      );
    }

    if (cpuGpu) {
      matchingVariants = matchingVariants.filter(
        (v) => v.cpuGpu.toLowerCase() === cpuGpu.toLowerCase()
      );
    }

    if (matchingVariants.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy biến thể với dung lượng: ${storage}${
          ram ? `, RAM: ${ram}` : ""
        }${cpuGpu ? `, CPU/GPU: ${cpuGpu}` : ""}`,
      });
    }

    let selectedVariant;
    if (sku) {
      selectedVariant = matchingVariants.find((v) => v.sku === sku);
      if (!selectedVariant) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy biến thể với SKU: ${sku} cho dung lượng ${storage}`,
        });
      }
    } else {
      // Default: first variant (sort by color alphabetically)
      selectedVariant = matchingVariants.sort((a, b) =>
        a.color.localeCompare(b.color)
      )[0];
    }

    res.json({
      success: true,
      data: {
        product,
        selectedVariantSku: selectedVariant.sku,
      },
    });
  } catch (error) {
    console.error("❌ GET PRODUCT DETAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET ALL Macs
// ============================================
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

    const products = await Mac.find(query)
      .populate("variants")
      .populate("createdBy", "fullName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Mac.countDocuments(query);

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
    console.error("❌ FIND ALL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET Mac by ID
// ============================================
export const findOne = async (req, res) => {
  try {
    const product = await Mac.findById(req.params.id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error("❌ FIND ONE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// DELETE Mac
// ============================================
export const deleteMac = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Mac.findById(req.params.id).session(session);

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // Delete all variants
    const deleteResult = await MacVariant.deleteMany(
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
      message: "Xóa sản phẩm thành công",
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

// ============================================
// GET variants by product ID
// ============================================
export const getVariants = async (req, res) => {
  try {
    const variants = await MacVariant.find({
      productId: req.params.id,
    }).sort({ color: 1, storage: 1 });

    res.json({
      success: true,
      data: { variants },
    });
  } catch (error) {
    console.error("❌ GET VARIANTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  create,
  findAll,
  findOne,
  update,
  deleteMac,
  getVariants,
  getProductDetail,
};
