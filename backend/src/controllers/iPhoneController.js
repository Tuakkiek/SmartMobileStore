// backend/src/controllers/iPhoneController.js
import mongoose from "mongoose";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import { getNextSku } from "../lib/generateSKU.js";

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

// Default values
const DEFAULT_STORAGE = "256GB";
const DEFAULT_COLOR = "cam vũ trụ";

// ============================================
// CREATE iPhone
// ============================================
export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("CREATE REQUEST:", JSON.stringify(req.body, null, 2));

    const {
      createVariants,
      variants,
      slug: frontendSlug,
      ...productData
    } = req.body;

    // === 1. VALIDATE REQUIRED FIELDS ===
    if (!productData.name?.trim()) throw new Error("Tên sản phẩm là bắt buộc");
    if (!productData.model?.trim()) throw new Error("Model là bắt buộc");
    if (!productData.createdBy) throw new Error("createdBy là bắt buộc");
    if (!productData.specifications)
      throw new Error("Thông số kỹ thuật là bắt buộc");

    // Chuẩn hóa colors
    const colors = Array.isArray(productData.specifications.colors)
      ? productData.specifications.colors.map((c) => c?.trim()).filter(Boolean)
      : productData.specifications.colors
      ? [productData.specifications.colors.trim()]
      : [];

    // === 2. TẠO SLUG (ưu tiên frontend, fallback từ model) ===
    const slug = frontendSlug?.trim() || createSlug(productData.model.trim());

    if (!slug) throw new Error("Không thể tạo slug từ model");

    // Kiểm tra slug trùng (tránh E11000)
    const existingBySlug = await IPhone.findOne({ slug }).session(session);
    if (existingBySlug) throw new Error(`Slug đã tồn tại: ${slug}`);

    // === 3. TẠO PRODUCT CHÍNH ===
    const product = new IPhone({
      name: productData.name.trim(),
      model: productData.model.trim(),
      slug,
      description: productData.description?.trim() || "",
      specifications: { ...productData.specifications, colors },
      condition: productData.condition || "NEW",
      brand: "Apple",
      category: "iPhone",
      status: productData.status || "AVAILABLE",
      installmentBadge: productData.installmentBadge || "NONE",
      createdBy: productData.createdBy,
      averageRating: 0,
      totalReviews: 0,
      variants: [],
    });

    await product.save({ session });
    console.log("Product created with slug:", slug);

    // === 4. XỬ LÝ VARIANTS ===
    const variantGroups = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantGroups.length > 0) {
      console.log(`Processing ${variantGroups.length} variant group(s)`);

      for (const group of variantGroups) {
        const { color, images = [], options = [] } = group;

        if (!color?.trim()) {
          console.warn("Skipping: missing color");
          continue;
        }
        if (!Array.isArray(options) || options.length === 0) {
          console.warn(`Skipping ${color}: no options`);
          continue;
        }

        for (const opt of options) {
          if (!opt.storage?.trim()) {
            console.warn(`Skipping option: missing storage`, opt);
            continue;
          }

          const sku = await getNextSku(); // Backend tự sinh

          const variantDoc = new IPhoneVariant({
            productId: product._id,
            color: color.trim(),
            storage: opt.storage.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((img) => img?.trim()),
            sku,
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
          console.log(`Created variant: ${sku} (${color} - ${opt.storage})`);
        }
      }

      // Cập nhật product với variant IDs + auto-specs
      const allColors = [...new Set(variantGroups.map((g) => g.color.trim()))];
      const allStorages = variantGroups
        .flatMap((g) => g.options.map((o) => o.storage.trim()))
        .filter(Boolean);
      const uniqueStorages = [...new Set(allStorages)].sort((a, b) => {
        const aNum = parseInt(a),
          bNum = parseInt(b);
        return aNum - bNum;
      });

      product.variants = createdVariantIds;
      product.specifications.colors = allColors;
      product.specifications.storage = uniqueStorages.join(" / ");

      await product.save({ session });
    }

    // === 5. COMMIT & RETURN ===
    await session.commitTransaction();

    const populated = await IPhone.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Tạo iPhone thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CREATE ERROR:", error.message);
    console.error("Stack:", error.stack);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Trường ${field} đã tồn tại: ${error.keyValue[field]}`,
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
// UPDATE iPhone
// ============================================
export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { createVariants, variants, slug: frontendSlug, ...data } = req.body;

    const product = await IPhone.findById(id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    // Cập nhật cơ bản
    if (data.name) product.name = data.name.trim();
    if (data.description !== undefined)
      product.description = data.description?.trim() || "";
    if (data.condition) product.condition = data.condition;
    if (data.status) product.status = data.status;
    if (data.installmentBadge) product.installmentBadge = data.installmentBadge;

    // Cập nhật slug nếu model thay đổi hoặc frontend gửi
    let newSlug = product.slug;
    if (data.model && data.model.trim() !== product.model) {
      newSlug = createSlug(data.model.trim());
    } else if (frontendSlug?.trim()) {
      newSlug = frontendSlug.trim();
    }

    if (newSlug !== product.slug) {
      const slugExists = await IPhone.findOne({
        slug: newSlug,
        _id: { $ne: id },
      }).session(session);
      if (slugExists) throw new Error(`Slug đã tồn tại: ${newSlug}`);
      product.slug = newSlug;
      product.model = data.model?.trim() || product.model;
    }

    // Cập nhật specifications
    if (data.specifications) {
      const colors = Array.isArray(data.specifications.colors)
        ? data.specifications.colors.map((c) => c?.trim()).filter(Boolean)
        : data.specifications.colors
        ? [data.specifications.colors.trim()]
        : product.specifications.colors;
      product.specifications = { ...data.specifications, colors };
    }

    await product.save({ session });

    // === XỬ LÝ VARIANTS ===
    const variantGroups = createVariants || variants || [];
    if (variantGroups.length > 0) {
      await IPhoneVariant.deleteMany({ productId: id }, { session });
      const newIds = [];

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.storage?.trim()) continue;
          const sku = await getNextSku();

          const v = new IPhoneVariant({
            productId: id,
            color: color.trim(),
            storage: opt.storage.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((i) => i?.trim()),
            sku,
          });
          await v.save({ session });
          newIds.push(v._id);
        }
      }

      // Cập nhật specs
      const allColors = [...new Set(variantGroups.map((g) => g.color.trim()))];
      const storages = variantGroups
        .flatMap((g) => g.options.map((o) => o.storage.trim()))
        .filter(Boolean);
      const sorted = [...new Set(storages)].sort(
        (a, b) => parseInt(a) - parseInt(b)
      );

      product.variants = newIds;
      product.specifications.colors = allColors;
      product.specifications.storage = sorted.join(" / ");
      await product.save({ session });
    }

    await session.commitTransaction();

    const populated = await IPhone.findById(id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("UPDATE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET BY SKU
// ============================================
export const findOneBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    const variant = await IPhoneVariant.findOne({ sku: sku.trim() });
    if (!variant)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy SKU" });

    const product = await IPhone.findById(variant.productId)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.json({ success: true, data: { product, selectedVariantSku: sku } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// FILE: backend/src/controllers/iPhoneController.js
// ✅ FIXED: getProductDetail - xử lý slug có storage
// ============================================

export const getProductDetail = async (req, res) => {
  try {
    let { slug } = req.params; // iphone-16-128gb hoặc iphone-16
    const skuQuery = req.query.sku?.trim();

    console.log("🔍 getProductDetail:", { slug, sku: skuQuery });

    // BƯỚC 1: Tách storage từ slug (nếu có)
    const parts = slug.split("-");
    let storage = null;
    let baseSlug = slug;

    // Kiểm tra part cuối có phải dạng 128gb, 256gb không
    const lastPart = parts[parts.length - 1];
    if (/^\d+gb$/i.test(lastPart)) {
      storage = lastPart.toUpperCase(); // 128GB
      parts.pop();
      baseSlug = parts.join("-"); // iphone-16
      console.log("✅ Extracted storage from slug:", storage);
    }

    // BƯỚC 2: TÌM PRODUCT theo baseSlug (không có storage)
    const product = await IPhone.findOne({ slug: baseSlug })
      .populate("variants")
      .populate("createdBy", "fullName email");

    if (!product) {
      console.log("❌ Product not found with slug:", baseSlug);
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy sản phẩm" 
      });
    }

    console.log("✅ Product found:", product.name, "| Variants:", product.variants.length);

    // BƯỚC 3: TÌM VARIANT PHÙ HỢP
    let variant = null;

    // Ưu tiên 1: Tìm theo SKU từ query string
    if (skuQuery) {
      variant = product.variants.find((v) => v.sku === skuQuery);
      if (variant) {
        console.log("✅ Found variant by SKU:", skuQuery);
      }
    }

    // Ưu tiên 2: Tìm theo storage + default color
    if (!variant && storage) {
      const defaultColor = "cam vũ trụ";
      
      // Tìm variant với storage + default color
      variant = product.variants.find(
        (v) =>
          v.storage?.toUpperCase() === storage &&
          v.color?.toLowerCase() === defaultColor.toLowerCase()
      );

      // Nếu không có, tìm variant với storage bất kỳ màu nào
      if (!variant) {
        variant = product.variants.find(
          (v) => v.storage?.toUpperCase() === storage
        );
      }

      if (variant) {
        console.log("✅ Found variant by storage:", storage, "| Color:", variant.color);
      }
    }

    // Ưu tiên 3: Fallback - lấy variant đầu tiên có stock > 0
    if (!variant) {
      variant = product.variants.find((v) => v.stock > 0);
      if (variant) {
        console.log("✅ Fallback: Using first variant with stock");
      }
    }

    // Ưu tiên 4: Lấy variant đầu tiên
    if (!variant && product.variants.length > 0) {
      variant = product.variants[0];
      console.log("⚠️ Fallback: Using first variant (no stock check)");
    }

    // BƯỚC 4: KHÔNG TÌM THẤY VARIANT NÀO
    if (!variant) {
      console.log("❌ No variant found for product:", product.name);
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy biến thể sản phẩm" 
      });
    }

    // BƯỚC 5: TRẢ VỀ KẾT QUẢ
    console.log("✅ Returning product with variant SKU:", variant.sku);
    
    res.json({
      success: true,
      data: { 
        product, 
        selectedVariantSku: variant.sku 
      },
    });
  } catch (error) {
    console.error("❌ getProductDetail error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Lỗi server" 
    });
  }
};
// ============================================
// GET ALL
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
    if (status) query.status = status;

    const [products, count] = await Promise.all([
      IPhone.find(query)
        .populate("variants")
        .populate("createdBy", "fullName")
        .skip((page - 1) * limit)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      IPhone.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: +page,
        total: count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET ONE BY ID
// ============================================
export const findOne = async (req, res) => {
  try {
    const product = await IPhone.findById(req.params.id)
      .populate("variants")
      .populate("createdBy", "fullName email");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });

    res.json({ success: true, data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DELETE
// ============================================
export const deleteIPhone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await IPhone.findById(req.params.id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    await IPhoneVariant.deleteMany({ productId: product._id }, { session });
    await product.deleteOne({ session });

    await session.commitTransaction();
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    await session.abortTransaction();
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
    const variants = await IPhoneVariant.find({
      productId: req.params.id,
    }).sort({ color: 1, storage: 1 });
    res.json({ success: true, data: { variants } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export
export default {
  create,
  update,
  findAll,
  findOne,
  deleteIPhone,
  getVariants,
  findOneBySku,
  getProductDetail,
};
