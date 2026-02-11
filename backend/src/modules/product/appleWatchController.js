// backend/src/controllers/appleWatchController.js
import mongoose from "mongoose";
import AppleWatch, { AppleWatchVariant } from "./AppleWatch.js";
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

// FIXED: Tạo variant slug = baseSlug + variantName (không có color)
const createVariantSlug = (baseSlug, variantName) => {
  const nameSlug = createSlug(variantName);
  return `${baseSlug}-${nameSlug}`;
};

// ============================================
// CREATE Apple Watch
// ============================================
export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(
      "CREATE APPLE WATCH REQUEST:",
      JSON.stringify(req.body, null, 2)
    );

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

    // === 2. TẠO SLUG ===
    const finalSlug =
      frontendSlug?.trim() || createSlug(productData.model.trim());

    if (!finalSlug) throw new Error("Không thể tạo slug từ model");

    // Kiểm tra slug trùng (product)
    const existingBySlug = await AppleWatch.findOne({
      $or: [{ slug: finalSlug }, { baseSlug: finalSlug }],
    }).session(session);

    if (existingBySlug) throw new Error(`Slug đã tồn tại: ${finalSlug}`);

    console.log("Generated slug:", finalSlug);

    // === 3. TẠO PRODUCT CHÍNH ===
    const product = new AppleWatch({
      name: productData.name.trim(),
      model: productData.model.trim(),
      slug: finalSlug,
      baseSlug: finalSlug,
      description: productData.description?.trim() || "",
      specifications: { ...productData.specifications, colors },
      category: productData.category?.trim() || "Apple Watch",
      status: productData.status || "AVAILABLE",
      installmentBadge: productData.installmentBadge || "NONE",
      createdBy: productData.createdBy,
      averageRating: 0,
      totalReviews: 0,
      salesCount: 0,
      variants: [],

      featuredImages: productData.featuredImages || [],
      videoUrl: productData.videoUrl?.trim() || "",
    });

    await product.save({ session });
    console.log("Product created:", {
      slug: finalSlug,
      baseSlug: finalSlug,
      name: product.name,
    });

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
          if (!opt.variantName?.trim()) {
            console.warn(`Skipping option: missing variantName`, opt);
            continue;
          }

          const sku = await getNextSku(); // TỰ ĐỘNG TẠO SKU
          const variantSlug = createVariantSlug(
            finalSlug,
            opt.variantName.trim()
          );

          // ĐÃ XÓA KIỂM TRA TRÙNG SLUG → CHO PHÉP TRÙNG
          // const existingVariantSlug = await AppleWatchVariant.findOne({ slug: variantSlug }).session(session);
          // if (existingVariantSlug) throw new Error(`Variant slug đã tồn tại: ${variantSlug}`);

          const variantDoc = new AppleWatchVariant({
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
          console.log(`Created variant: ${sku} → ${variantSlug}`);
        }
      }

      // Cập nhật product với variant IDs + auto-specs
      const allColors = [...new Set(variantGroups.map((g) => g.color.trim()))];
      const allVariantNames = variantGroups
        .flatMap((g) => g.options.map((o) => o.variantName.trim()))
        .filter(Boolean);
      const uniqueVariantNames = [...new Set(allVariantNames)].sort();

      product.variants = createdVariantIds;
      product.specifications.colors = allColors;
      product.specifications.variantNames = uniqueVariantNames.join(" / ");

      await product.save({ session });
    }

    // === 5. COMMIT & RETURN ===
    await session.commitTransaction();

    const populated = await AppleWatch.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Tạo Apple Watch thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CREATE APPLE WATCH ERROR:", error.message);
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
// UPDATE Apple Watch
// ============================================
export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { createVariants, variants, slug: frontendSlug, ...data } = req.body;

    console.log("UPDATE APPLE WATCH REQUEST:", id);

    const product = await AppleWatch.findById(id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    // Cập nhật cơ bản
    if (data.name) product.name = data.name.trim();
    if (data.description !== undefined)
      product.description = data.description?.trim() || "";
    if (data.status) product.status = data.status;
    if (data.installmentBadge) product.installmentBadge = data.installmentBadge;

    if (data.featuredImages !== undefined)
      product.featuredImages = data.featuredImages;
    if (data.videoUrl !== undefined)
      product.videoUrl = data.videoUrl?.trim() || "";

    // Cập nhật slug nếu model thay đổi hoặc frontend gửi
    let newSlug = product.slug || product.baseSlug;

    if (data.model && data.model.trim() !== product.model) {
      newSlug = createSlug(data.model.trim());
    } else if (frontendSlug?.trim()) {
      newSlug = frontendSlug.trim();
    }

    if (newSlug !== (product.slug || product.baseSlug)) {
      const slugExists = await AppleWatch.findOne({
        $or: [{ slug: newSlug }, { baseSlug: newSlug }],
        _id: { $ne: id },
      }).session(session);

      if (slugExists) throw new Error(`Slug đã tồn tại: ${newSlug}`);

      product.slug = newSlug;
      product.baseSlug = newSlug;
      product.model = data.model?.trim() || product.model;

      console.log("Updated slug & baseSlug to:", newSlug);
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
      console.log(`Updating ${variantGroups.length} variant group(s)`);

      await AppleWatchVariant.deleteMany({ productId: id }, { session });
      const newIds = [];

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.variantName?.trim()) continue;

          const sku = await getNextSku(); // TỰ ĐỘNG TẠO SKU
          const variantSlug = createVariantSlug(
            product.baseSlug || product.slug,
            opt.variantName.trim()
          );

          const v = new AppleWatchVariant({
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
          console.log(`Updated variant: ${sku} → ${variantSlug}`);
        }
      }

      const allColors = [...new Set(variantGroups.map((g) => g.color.trim()))];
      const variantNames = variantGroups
        .flatMap((g) => g.options.map((o) => o.variantName.trim()))
        .filter(Boolean);
      const sorted = [...new Set(variantNames)].sort();

      product.variants = newIds;
      product.specifications.colors = allColors;
      product.specifications.variantNames = sorted.join(" / ");
      await product.save({ session });
    }

    await session.commitTransaction();

    const populated = await AppleWatch.findById(id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("UPDATE APPLE WATCH ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET BY VARIANT SLUG hoặc BASE SLUG
// ============================================
export const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const slug = id;
    const skuQuery = req.query.sku?.trim();

    console.log("getProductDetail Apple Watch:", { slug, sku: skuQuery });

    let variant = await AppleWatchVariant.findOne({ slug });
    let product = null;

    if (variant) {
      product = await AppleWatch.findById(variant.productId)
        .populate("variants")
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
          console.log("Switched to variant by SKU:", skuQuery);
        }
      }
    } else {
      product = await AppleWatch.findOne({
        $or: [{ baseSlug: slug }, { slug: slug }],
      })
        .populate("variants")
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
    console.error("getProductDetail Apple Watch error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// Export các functions còn lại giữ nguyên...
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
      AppleWatch.find(query)
        .populate("variants")
        .populate("createdBy", "fullName")
        .skip((page - 1) * limit)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      AppleWatch.countDocuments(query),
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

export const findOne = async (req, res) => {
  try {
    const product = await AppleWatch.findById(req.params.id)
      .populate("variants")
      .populate("createdBy", "fullName email");
    if (!product)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy",
      });

    res.json({ success: true, data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAppleWatch = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await AppleWatch.findById(req.params.id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    await AppleWatchVariant.deleteMany({ productId: product._id }, { session });
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

export const getVariants = async (req, res) => {
  try {
    const variants = await AppleWatchVariant.find({
      productId: req.params.id,
    }).sort({ color: 1, variantName: 1 });
    res.json({ success: true, data: { variants } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  create,
  update,
  findAll,
  findOne,
  deleteAppleWatch,
  getVariants,
  getProductDetail,
};
