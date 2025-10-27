// ============================================
// FILE: backend/src/controllers/iPadController.js
// ✅ ADAPTED FROM iPhoneController - iPad + iPadVariant
// ============================================

import mongoose from 'mongoose';
import IPad, { IPadVariant } from '../models/IPad.js';

// ============================================
// CREATE iPad with variants
// ============================================
// ✅ FIX CREATE - RELAX VALIDATION CHO IPAD
export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 CREATE IPAD PAYLOAD:", JSON.stringify(req.body, null, 2));
    
    const { createVariants, variants, ...productData } = req.body;

    // VALIDATE MAIN PRODUCT
    if (!productData.name?.trim() || !productData.model?.trim()) {
      throw new Error('Tên và Model là bắt buộc');
    }
    if (!productData.createdBy) {
      throw new Error('createdBy là bắt buộc');
    }

    // CREATE MAIN PRODUCT FIRST
    const product = new IPad({
      name: productData.name.trim(),
      model: productData.model.trim(),
      description: productData.description?.trim() || '',
      specifications: productData.specifications || {},
      variants: [],
      condition: productData.condition || 'NEW',
      brand: 'Apple',
      category: productData.category || 'iPad',
      status: productData.status || 'AVAILABLE',
      createdBy: productData.createdBy,
      averageRating: 0,
      totalReviews: 0,
    });

    await product.save({ session });
    console.log("✅ iPad CREATED:", product._id);

    // ✅ FIXED: HANDLE VARIANTS - RELAX VALIDATION
    const variantsToCreate = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantsToCreate.length > 0) {
      console.log(`📦 Processing ${variantsToCreate.length} color groups`);

      for (const variantGroup of variantsToCreate) {
        const { color, images = [], options = [] } = variantGroup;

        if (!color?.trim()) {
          console.warn("⚠️ Skipping: missing color");
          continue;
        }

        console.log(`  🎨 Color: ${color} (${options.length} options)`);

        // ✅ CREATE ONE VARIANT PER OPTION
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          
          // RELAXED VALIDATION - Chỉ cần SKU + PRICE
          if (!option.sku?.trim()) {
            console.warn(`    ⚠️ Skipping option ${i}: missing SKU`);
            continue;
          }

          // ✅ IPAD: connectivity là optional (nếu frontend chưa gửi)
          const connectivity = option.connectivity?.trim() || "WiFi";

          const variantDoc = new IPadVariant({
            color: color.trim(),
            storage: option.storage?.trim() || `${128 + (i * 128)}GB`,
            connectivity,
            originalPrice: Number(option.originalPrice) || 0,
            price: Number(option.price) || 0,
            stock: Number(option.stock) || 0,
            images: Array.isArray(images) ? images.filter(img => img?.trim()) : [],
            sku: option.sku.trim(),
            productId: product._id,
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
          
          console.log(`    ✅ VARIANT: ${variantDoc.sku} (${connectivity})`);
        }
      }

      // UPDATE PRODUCT WITH VARIANTS
      product.variants = createdVariantIds;
      
      // AUTO-POPULATE SPECS FROM VARIANTS
      if (variantsToCreate.length > 0) {
        const allColors = [...new Set(variantsToCreate.map(v => v.color?.trim()).filter(Boolean))];
        const allStorages = variantsToCreate
          .flatMap(v => v.options.map(o => o.storage?.trim()))
          .filter(Boolean);
        
        product.specifications.colors = allColors;
        product.specifications.storage = [...new Set(allStorages)].sort().join(' / ');
      }

      await product.save({ session });
      console.log(`✅ UPDATED with ${createdVariantIds.length} variants`);
    }

    await session.commitTransaction();

    // RETURN POPULATED PRODUCT
    const populatedProduct = await IPad.findById(product._id)
      .populate('variants')
      .populate('createdBy', 'fullName email');

    res.status(201).json({
      success: true,
      message: `Tạo iPad thành công với ${createdVariantIds.length} biến thể`,
      data: { product: populatedProduct }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ CREATE ERROR:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `SKU đã tồn tại: ${Object.values(error.keyValue)[0]}`
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi tạo iPad'
    });
  } finally {
    session.endSession();
  }
};
// ============================================
// UPDATE iPad
// ============================================
export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 UPDATE IPAD REQUEST:", req.params.id);
    console.log("📥 UPDATE BODY:", JSON.stringify(req.body, null, 2));
    
    const { createVariants, variants, ...productData } = req.body;

    // ✅ 1. FIND & UPDATE PRODUCT
    const product = await IPad.findById(req.params.id).session(session);
    
    if (!product) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    // Update main fields
    if (productData.name) product.name = productData.name.trim();
    if (productData.model) product.model = productData.model.trim();
    if (productData.description !== undefined) product.description = productData.description?.trim() || '';
    if (productData.condition) product.condition = productData.condition;
    if (productData.status) product.status = productData.status;
    if (productData.specifications) {
      // Ensure colors is array
      if (productData.specifications.colors && !Array.isArray(productData.specifications.colors)) {
        productData.specifications.colors = [productData.specifications.colors];
      }
      product.specifications = productData.specifications;
    }

    await product.save({ session });
    console.log("✅ iPad basic info updated");

    // ✅ 2. HANDLE VARIANTS UPDATE
    const variantsToUpdate = createVariants || variants;

    if (variantsToUpdate && Array.isArray(variantsToUpdate) && variantsToUpdate.length > 0) {
      console.log(`📦 Updating iPad variants...`);

      // Delete old variants
      const deleteResult = await IPadVariant.deleteMany(
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

        console.log(`  📝 Processing color: ${color} (${options.length} options)`);

        for (const option of options) {
          // ✅ IPAD-SPECIFIC VALIDATION
          if (!option.storage || !option.connectivity || !option.sku) {
            console.warn(`    ⚠️ Skipping option: missing storage, connectivity or sku`, option);
            continue;
          }

          const variantDoc = new IPadVariant({
            color: color.trim(),
            storage: option.storage.trim(),
            connectivity: option.connectivity.trim(), // ✅ IPAD UNIQUE FIELD
            originalPrice: Number(option.originalPrice) || 0,
            price: Number(option.price) || 0,
            stock: Number(option.stock) || 0,
            images: Array.isArray(images) ? images.filter(img => img && img.trim()) : [],
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
      const allColors = [...new Set(variantsToUpdate.map(v => v.color.trim()))];
      const allStorages = variantsToUpdate
        .flatMap(v => v.options.map(o => o.storage.trim()))
        .filter(Boolean);
      const uniqueStorages = [...new Set(allStorages)].sort((a, b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        return aNum - bNum;
      });

      product.specifications.colors = allColors;
      product.specifications.storage = uniqueStorages.join(' / ');

      await product.save({ session });
      console.log(`✅ iPad updated with ${createdVariantIds.length} new variants`);
    }

    // ✅ 3. COMMIT & RETURN
    await session.commitTransaction();

    const populatedProduct = await IPad.findById(product._id)
      .populate('variants')
      .populate('createdBy', 'fullName email');

    console.log("✅ iPad update transaction committed");

    res.json({
      success: true,
      message: 'Cập nhật iPad thành công',
      data: { product: populatedProduct }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ UPDATE IPAD ERROR:", error.message);
    console.error("❌ Stack:", error.stack);

    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật sản phẩm'
    });

  } finally {
    session.endSession();
  }
};

// ============================================
// GET ALL iPads
// ============================================
export const findAll = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const products = await IPad.find(query)
      .populate('variants')
      .populate('createdBy', 'fullName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await IPad.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
        total: count
      }
    });
  } catch (error) {
    console.error("❌ FIND ALL IPAD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// GET iPad by ID
// ============================================
export const findOne = async (req, res) => {
  try {
    const product = await IPad.findById(req.params.id)
      .populate('variants')
      .populate('createdBy', 'fullName email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error("❌ FIND ONE IPAD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// DELETE iPad
// ============================================
export const deleteIPad = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await IPad.findById(req.params.id).session(session);

    if (!product) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    // Delete all variants
    const deleteResult = await IPadVariant.deleteMany(
      { productId: product._id },
      { session }
    );
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} variants`);

    // Delete product
    await product.deleteOne({ session });
    console.log(`🗑️ Deleted iPad product: ${product._id}`);

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Xóa iPad thành công'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ DELETE IPAD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
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
    const variants = await IPadVariant.find({
      productId: req.params.id
    }).sort({ color: 1, storage: 1, connectivity: 1 });

    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
    console.error("❌ GET IPAD VARIANTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  create,
  findAll,
  findOne,
  update,
  deleteIPad,
  getVariants
};