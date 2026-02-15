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
    .replace(/đ/g, "d")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

// Tạo variant slug = baseSlug + color + variantName
const createVariantSlug = (baseSlug, color, variantName) => {
  const colorSlug = createSlug(color);
  const nameSlug = createSlug(variantName);
  return [baseSlug, colorSlug, nameSlug].filter(Boolean).join("-");
};

const canManageVariantStock = (role) => {
  return role === "WAREHOUSE_MANAGER";
};

const STOCK_CONTROL_OWNER_ROLE = "WAREHOUSE_MANAGER";

const normalizeStockValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const hasVariantStockInput = (variantGroups = []) => {
  if (!Array.isArray(variantGroups) || variantGroups.length === 0) return false;

  for (const group of variantGroups) {
    const options = Array.isArray(group?.options) ? group.options : [];
    for (const opt of options) {
      if (!Object.prototype.hasOwnProperty.call(opt || {}, "stock")) {
        continue;
      }

      if (opt.stock === "" || opt.stock === null || opt.stock === undefined) {
        continue;
      }

      const parsed = Number(opt.stock);
      if (!Number.isFinite(parsed) || parsed !== 0) {
        return true;
      }
    }
  }

  return false;
};

const buildVariantStockKey = (color, variantName) => {
  const normalizedColor = String(color || "").trim().toLowerCase();
  const normalizedVariant = String(variantName || "").trim().toLowerCase();
  return `${normalizedColor}::${normalizedVariant}`;
};

const RESERVED_VARIANT_FIELDS = new Set([
  "variantName",
  "originalPrice",
  "price",
  "stock",
  "sku",
  "slug",
]);

const extractVariantAttributes = (option = {}) => {
  if (!option || typeof option !== "object") return {};

  const attrs = {};
  for (const [key, value] of Object.entries(option)) {
    if (RESERVED_VARIANT_FIELDS.has(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    attrs[key] = value;
  }
  return attrs;
};

const deriveVariantName = (option = {}) => {
  const explicitName = String(option?.variantName || "").trim();
  if (explicitName) return explicitName;

  const fallbackParts = [
    option?.storage,
    option?.connectivity,
    option?.cpuGpu,
    option?.ram,
    option?.bandSize,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (fallbackParts.length > 0) {
    return fallbackParts.join(" - ");
  }

  return "";
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
    const variantGroups = createVariants || variants || [];
    const stockInputIgnored = hasVariantStockInput(variantGroups);

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
    if (!Array.isArray(variantGroups) || variantGroups.length === 0) {
      throw new Error("Cần ít nhất một biến thể sản phẩm");
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
    const createdVariantIds = [];
    const seenVariantKeys = new Set();

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
          const derivedVariantName = deriveVariantName(opt);
          if (!derivedVariantName) {
            console.warn(`⚠️ Skipping option: missing variantName`, opt);
            continue;
          }

          const variantKey = buildVariantStockKey(color, derivedVariantName);
          if (seenVariantKeys.has(variantKey)) {
            throw new Error(`Biến thể bị trùng: ${color} / ${derivedVariantName}`);
          }
          seenVariantKeys.add(variantKey);

          const sku = await getNextSku();
          const variantSlug = createVariantSlug(finalSlug, color, derivedVariantName);

          const variantDoc = new UniversalVariant({
            productId: product._id,
            color: color.trim(),
            variantName: derivedVariantName,
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            // Phase 1 rule: stock starts at 0 and is managed by warehouse flows.
            stock: 0,
            images: images.filter((img) => img?.trim()),
            sku,
            slug: variantSlug,
            attributes: extractVariantAttributes(opt),
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
          console.log(`✅ Created variant: ${sku} → ${variantSlug}`);
        }
      }

      if (createdVariantIds.length === 0) {
        throw new Error("Không tạo được biến thể hợp lệ nào");
      }

      // Cập nhật product với variant IDs
      product.variants = createdVariantIds;
      await product.save({ session });
    }

    if (stockInputIgnored) {
      console.info(
        `[PRODUCT][CREATE] Ignored stock values from role ${req.user?.role}. Inventory quantity is controlled by ${STOCK_CONTROL_OWNER_ROLE}.`
      );
    }

    // === 5. COMMIT & RETURN ===
    await session.commitTransaction();

    const populated = await UniversalProduct.findById(product._id)
      .populate("variants")
      .populate("brand", "name logo")
      .populate("productType", "name specFields")
      .populate("createdBy", "fullName email");

    const responsePayload = {
      success: true,
      message: "Tạo sản phẩm thành công",
      data: { product: populated },
    };

    if (stockInputIgnored) {
      responsePayload.warning = `Stock input ignored. Inventory quantity is controlled by ${STOCK_CONTROL_OWNER_ROLE}.`;
    }

    res.status(201).json(responsePayload);
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
    if (!product) throw new Error("Khong tim thay san pham");
    const allowStockManagement = canManageVariantStock(req.user?.role);
    const variantGroups = createVariants || variants || [];
    const stockInputIgnored = !allowStockManagement && hasVariantStockInput(variantGroups);

    const existingVariants = await UniversalVariant.find({ productId: id })
      .select("color variantName stock sku")
      .session(session);
    const variantStateByKey = new Map();
    for (const item of existingVariants) {
      variantStateByKey.set(
        buildVariantStockKey(item.color, item.variantName),
        {
          stock: normalizeStockValue(item.stock),
          sku: String(item.sku || ""),
        }
      );
    }

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
    if (variantGroups.length > 0) {
      console.log(`📦 Updating ${variantGroups.length} variant group(s)`);

      await UniversalVariant.deleteMany({ productId: id }, { session });
      const newIds = [];
      const seenVariantKeys = new Set();

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          const derivedVariantName = deriveVariantName(opt);
          if (!derivedVariantName) continue;

          const variantKey = buildVariantStockKey(color, derivedVariantName);
          if (seenVariantKeys.has(variantKey)) {
            throw new Error(`Biến thể bị trùng: ${color} / ${derivedVariantName}`);
          }
          seenVariantKeys.add(variantKey);

          const previousVariantState = variantStateByKey.get(variantKey);
          const sku = previousVariantState?.sku || (await getNextSku());
          const variantSlug = createVariantSlug(
            product.baseSlug || product.slug,
            color,
            derivedVariantName
          );

          const v = new UniversalVariant({
            productId: id,
            color: color.trim(),
            variantName: derivedVariantName,
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: allowStockManagement
              ? Object.prototype.hasOwnProperty.call(opt || {}, "stock")
                ? normalizeStockValue(opt.stock)
                : previousVariantState?.stock || 0
              : previousVariantState?.stock || 0,
            images: images.filter((i) => i?.trim()),
            sku,
            slug: variantSlug,
            attributes: extractVariantAttributes(opt),
          });

          await v.save({ session });
          newIds.push(v._id);
          console.log(`✅ Updated variant: ${sku} → ${variantSlug}`);
        }
      }

      if (newIds.length === 0) {
        throw new Error("Không tạo được biến thể hợp lệ nào");
      }

      product.variants = newIds;
      await product.save({ session });
    }

    if (stockInputIgnored) {
      console.info(
        `[PRODUCT][UPDATE] Ignored stock values from role ${req.user?.role}. Inventory quantity is controlled by ${STOCK_CONTROL_OWNER_ROLE}.`
      );
    }

    await session.commitTransaction();

    const populated = await UniversalProduct.findById(id)
      .populate("variants")
      .populate("brand", "name logo")
      .populate("productType", "name specFields")
      .populate("createdBy", "fullName email");

    const responsePayload = {
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    };

    if (stockInputIgnored) {
      responsePayload.warning = `Stock input ignored. Inventory quantity is controlled by ${STOCK_CONTROL_OWNER_ROLE}.`;
    }

    res.json(responsePayload);
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
