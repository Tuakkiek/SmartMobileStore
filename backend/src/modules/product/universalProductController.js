// ============================================
// FILE: backend/src/modules/product/universalProductController.js
// ✅ Controller cho Universal Product (Tất cả sản phẩm)
// ============================================

import mongoose from "mongoose";
import UniversalProduct, { UniversalVariant } from "./UniversalProduct.js";
import { getNextSku } from "../../lib/generateSKU.js";

// Helper: Tạo slug chuẩn SEO
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

// Tạo variant slug = baseSlug + variantName
const createVariantSlug = (baseSlug, variantName) => {
  const nameSlug = createSlug(variantName);
  return `${baseSlug}-${nameSlug}`;
};

// ============================================
// CREATE PRODUCT
// ============================================
export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📥 CREATE UNIVERSAL PRODUCT REQUEST:", JSON.stringify(req.body, null, 2));

    const {
      createVariants,
      variants,
      slug: frontendSlug,
      ...productData
    } = req.body;

    // === 1. VALIDATE REQUIRED FIELDS ===
    if (!productData.name?.trim()) {
      throw new Error("Tên sản phẩm là bắt buộc");
    }
    if (!productData.model?.trim()) {
      throw new Error("Model là bắt buộc");
    }
    if (!productData.brand) {
      throw new Error("Hãng sản xuất là bắt buộc");
    }
    if (!productData.productType) {
      throw new Error("Loại sản phẩm là bắt buộc");
    }
    if (!productData.createdBy) {
      throw new Error("createdBy là bắt buộc");
    }

    // === 2. TẠO SLUG ===
    const finalSlug = frontendSlug?.trim() || createSlug(productData.model.trim());
    if (!finalSlug) throw new Error("Không thể tạo slug từ model");

    // Kiểm tra slug trùng
    const existingBySlug = await UniversalProduct.findOne({
      $or: [{ slug: finalSlug }, { baseSlug: finalSlug }],
    }).session(session);

    if (existingBySlug) {
      throw new Error(`Slug đã tồn tại: ${finalSlug}`);
    }

    console.log("✅ Generated slug:", finalSlug);

    // === 3. TẠO PRODUCT CHÍNH ===
    const product = new UniversalProduct({
      name: productData.name.trim(),
      model: productData.model.trim(),
      slug: finalSlug,
      baseSlug: finalSlug,
      description: productData.description?.trim() || "",
      brand: productData.brand,
      productType: productData.productType,
      specifications: productData.specifications || {},
      condition: productData.condition || "NEW",
      status: productData.status || "AVAILABLE",
      installmentBadge: productData.installmentBadge || "NONE",
      createdBy: productData.createdBy,
      featuredImages: productData.featuredImages || [],
      videoUrl: productData.videoUrl?.trim() || "",
      averageRating: 0,
      totalReviews: 0,
      salesCount: 0,
      variants: [],
    });

    await product.save({ session });
    console.log("✅ Product created:", {
      id: product._id,
      slug: finalSlug,
      name: product.name,
    });

    // === 4. XỬ LÝ VARIANTS ===
    const variantGroups = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantGroups.length > 0) {
      console.log(`📦 Processing ${variantGroups.length} variant group(s)`);

      for (const group of variantGroups) {
        const { color, images = [], options = [] } = group;

        if (!color?.trim()) {
          console.warn("⚠️ Skipping: missing color");
          continue;
        }
        if (!Array.isArray(options) || options.length === 0) {
          console.warn(`⚠️ Skipping ${color}: no options`);
          continue;
        }

        for (const opt of options) {
          if (!opt.variantName?.trim()) {
            console.warn(`⚠️ Skipping option: missing variantName`, opt);
            continue;
          }

          const sku = await getNextSku();
          const variantSlug = createVariantSlug(finalSlug, opt.variantName.trim());

          const variantDoc = new UniversalVariant({
            productId: product._id,
            color: color.trim(),
            variantName: opt.variantName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((img) => img?.trim()),
            sku,
            slug: variantSlug,
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
          console.log(`✅ Created variant: ${sku} → ${variantSlug}`);
        }
      }

      // Cập nhật product với variant IDs
      product.variants = createdVariantIds;
      await product.save({ session });
    }

    // === 5. COMMIT & RETURN ===
    await session.commitTransaction();

    const populated = await UniversalProduct.findById(product._id)
      .populate("variants")
      .populate("brand", "name logo")
      .populate("productType", "name specFields")
      .populate("createdBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ CREATE PRODUCT ERROR:", error.message);
    console.error("Stack:", error.stack);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `Trường ${field} đã tồn tại: ${value}`,
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
// UPDATE PRODUCT
// ============================================
export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { createVariants, variants, slug: frontendSlug, ...data } = req.body;

    console.log("📝 UPDATE UNIVERSAL PRODUCT REQUEST:", id);

    const product = await UniversalProduct.findById(id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    // Cập nhật cơ bản
    if (data.name) product.name = data.name.trim();
    if (data.description !== undefined) product.description = data.description?.trim() || "";
    if (data.brand) product.brand = data.brand;
    if (data.productType) product.productType = data.productType;
    if (data.condition) product.condition = data.condition;
    if (data.status) product.status = data.status;
    if (data.installmentBadge) product.installmentBadge = data.installmentBadge;
    if (data.featuredImages !== undefined) product.featuredImages = data.featuredImages;
    if (data.videoUrl !== undefined) product.videoUrl = data.videoUrl?.trim() || "";
    if (data.specifications !== undefined) product.specifications = data.specifications;

    // Cập nhật slug nếu model thay đổi
    let newSlug = product.slug || product.baseSlug;

    if (data.model && data.model.trim() !== product.model) {
      newSlug = createSlug(data.model.trim());
    } else if (frontendSlug?.trim()) {
      newSlug = frontendSlug.trim();
    }

    if (newSlug !== (product.slug || product.baseSlug)) {
      const slugExists = await UniversalProduct.findOne({
        $or: [{ slug: newSlug }, { baseSlug: newSlug }],
        _id: { $ne: id },
      }).session(session);

      if (slugExists) throw new Error(`Slug đã tồn tại: ${newSlug}`);

      product.slug = newSlug;
      product.baseSlug = newSlug;
      product.model = data.model?.trim() || product.model;

      console.log("✅ Updated slug & baseSlug to:", newSlug);
    }

    await product.save({ session });

    // === XỬ LÝ VARIANTS ===
    const variantGroups = createVariants || variants || [];
    if (variantGroups.length > 0) {
      console.log(`📦 Updating ${variantGroups.length} variant group(s)`);

      await UniversalVariant.deleteMany({ productId: id }, { session });
      const newIds = [];

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.variantName?.trim()) continue;

          const sku = await getNextSku();
          const variantSlug = createVariantSlug(
            product.baseSlug || product.slug,
            opt.variantName.trim()
          );

          const v = new UniversalVariant({
            productId: id,
            color: color.trim(),
            variantName: opt.variantName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((i) => i?.trim()),
            sku,
            slug: variantSlug,
          });

          await v.save({ session });
          newIds.push(v._id);
          console.log(`✅ Updated variant: ${sku} → ${variantSlug}`);
        }
      }

      product.variants = newIds;
      await product.save({ session });
    }

    await session.commitTransaction();

    const populated = await UniversalProduct.findById(id)
      .populate("variants")
      .populate("brand", "name logo")
      .populate("productType", "name specFields")
      .populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ UPDATE PRODUCT ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET ALL PRODUCTS
// ============================================
// ... (other imports)

// ============================================
// GET ALL PRODUCTS (Enhanced for Warehouse)
// ============================================
export const findAll = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status, brand, productType } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 12;
    
    // 2. Build Query for Universal Products
    const uniQuery = {};
    if (search) {
      uniQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }
    if (status) uniQuery.status = status;
    if (brand) uniQuery.brand = brand;
    if (productType) uniQuery.productType = productType; // Filter by ID

    // Debug Queries
    console.log("🔎 Universal Query:", JSON.stringify(uniQuery));

    // 3. Execute Query (Universal Only)
    const [products, totalCount] = await Promise.all([
        UniversalProduct.find(uniQuery)
            .populate("variants")
            .populate("brand", "name logo")
            .populate("productType", "name slug")
            .populate("createdBy", "fullName")
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean(),
        UniversalProduct.countDocuments(uniQuery)
    ]);
    
    console.log(`📦 Universal Results: ${products.length}`);
    console.log(`∑ Total Products: ${totalCount}`);

    // 4. Normalize for frontend (mostly adding isUniversal flag and checking images)
    const allProducts = products.map(p => ({
        ...p,
        isUniversal: true,
        // Ensure featuredImages or valid image source
        featuredImages: p.featuredImages?.length ? p.featuredImages : (p.variants?.[0]?.images || [])
    }));

    return res.json({
      success: true,
      data: {
        products: allProducts,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        total: totalCount,
      },
    });

  } catch (error) {
    console.error("❌ GET PRODUCTS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET ONE PRODUCT
// ============================================
export const findOne = async (req, res) => {
  try {
    const product = await UniversalProduct.findById(req.params.id)
      .populate("variants")
      .populate("brand", "name logo website")
      .populate("productType", "name specFields")
      .populate("createdBy", "fullName email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy",
      });
    }

    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error("❌ GET PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET PRODUCT DETAIL BY SLUG
// ============================================
export const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const slug = id;
    const skuQuery = req.query.sku?.trim();

    console.log("🔍 getProductDetail Universal:", { slug, sku: skuQuery });

    let variant = await UniversalVariant.findOne({ slug });
    let product = null;

    if (variant) {
      product = await UniversalProduct.findById(variant.productId)
        .populate("variants")
        .populate("brand", "name logo website")
        .populate("productType", "name specFields")
        .populate("createdBy", "fullName email");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      if (skuQuery) {
        const variantBySku = product.variants.find((v) => v.sku === skuQuery);
        if (variantBySku) {
          variant = variantBySku;
          console.log("✅ Switched to variant by SKU:", skuQuery);
        }
      }
    } else {
      product = await UniversalProduct.findOne({
        $or: [{ baseSlug: slug }, { slug: slug }],
      })
        .populate("variants")
        .populate("brand", "name logo website")
        .populate("productType", "name specFields")
        .populate("createdBy", "fullName email");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      const variants = product.variants || [];
      variant = variants.find((v) => v.stock > 0) || variants[0];

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Sản phẩm không có biến thể",
        });
      }

      return res.json({
        success: true,
        redirect: true,
        redirectSlug: variant.slug,
        redirectSku: variant.sku,
        data: {
          product,
          selectedVariantSku: variant.sku,
        },
      });
    }

    res.json({
      success: true,
      data: {
        product,
        selectedVariantSku: variant.sku,
      },
    });
  } catch (error) {
    console.error("❌ getProductDetail error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// ============================================
// DELETE PRODUCT
// ============================================
export const deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await UniversalProduct.findById(req.params.id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    await UniversalVariant.deleteMany({ productId: product._id }, { session });
    await product.deleteOne({ session });

    await session.commitTransaction();
    console.log("✅ PRODUCT DELETED:", req.params.id);
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ DELETE PRODUCT ERROR:", error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET VARIANTS
// ============================================
export const getVariants = async (req, res) => {
  try {
    const variants = await UniversalVariant.find({
      productId: req.params.id,
    }).sort({ color: 1, variantName: 1 });

    res.json({ success: true, data: { variants } });
  } catch (error) {
    console.error("❌ GET VARIANTS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  create,
  update,
  findAll,
  findOne,
  getProductDetail,
  deleteProduct,
  getVariants,
};
