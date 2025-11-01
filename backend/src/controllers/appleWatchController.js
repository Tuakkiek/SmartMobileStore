// backend/src/controllers/appleWatchController.js
import mongoose from "mongoose";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";

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

// Variant slug: baseSlug-color-variantname
const createVariantSlug = (baseSlug, color, variantName) => {
  const colorSlug = createSlug(color);
  const nameSlug = createSlug(variantName);
  return `${baseSlug}-${colorSlug}-${nameSlug}`;
};

export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      createVariants,
      variants,
      slug: frontendSlug,
      ...productData
    } = req.body;

    if (!productData.name?.trim()) throw new Error("Tên sản phẩm là bắt buộc");
    if (!productData.model?.trim()) throw new Error("Model là bắt buộc");
    if (!productData.createdBy) throw new Error("createdBy là bắt buộc");

    const finalSlug =
      frontendSlug?.trim() || createSlug(productData.model.trim());
    if (!finalSlug) throw new Error("Không thể tạo slug từ model");

    const existingBySlug = await AppleWatch.findOne({
      $or: [{ slug: finalSlug }, { baseSlug: finalSlug }],
    }).session(session);

    if (existingBySlug) throw new Error(`Slug đã tồn tại: ${finalSlug}`);

    const product = new AppleWatch({
      name: productData.name.trim(),
      model: productData.model.trim(),
      slug: finalSlug,
      baseSlug: finalSlug,
      description: productData.description?.trim() || "",
      specifications: productData.specifications || {},
      category: productData.category?.trim() || "Apple Watch",
      status: productData.status || "AVAILABLE",
      installmentBadge: productData.installmentBadge || "NONE",
      createdBy: productData.createdBy,
      averageRating: 0,
      totalReviews: 0,
      salesCount: 0,
      variants: [],
    });

    await product.save({ session });

    const variantGroups = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantGroups.length > 0) {
      for (const group of variantGroups) {
        const { color, images = [], options = [] } = group;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.variantName?.trim() || !opt.sku?.trim()) continue;

          const variantSlug = createVariantSlug(
            finalSlug,
            color.trim(),
            opt.variantName.trim()
          );

          const existingVariantSlug = await AppleWatchVariant.findOne({
            slug: variantSlug,
          }).session(session);
          if (existingVariantSlug)
            throw new Error(`Variant slug đã tồn tại: ${variantSlug}`);

          const variantDoc = new AppleWatchVariant({
            productId: product._id,
            color: color.trim(),
            variantName: opt.variantName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((img) => img?.trim()),
            sku: opt.sku.trim(),
            slug: variantSlug,
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
        }
      }

      product.variants = createdVariantIds;
      product.specifications.colors = [
        ...new Set(variantGroups.map((g) => g.color.trim())),
      ];
      await product.save({ session });
    }

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
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
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

export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { createVariants, variants, slug: frontendSlug, ...data } = req.body;

    const product = await AppleWatch.findById(id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

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
    }

    if (data.name) product.name = data.name.trim();
    if (data.description !== undefined)
      product.description = data.description?.trim() || "";
    if (data.status) product.status = data.status;
    if (data.installmentBadge) product.installmentBadge = data.installmentBadge;
    if (data.specifications) product.specifications = data.specifications;

    await product.save({ session });

    const variantGroups = createVariants || variants || [];
    if (variantGroups.length > 0) {
      await AppleWatchVariant.deleteMany({ productId: id }, { session });
      const newIds = [];

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.variantName?.trim() || !opt.sku?.trim()) continue;

          const variantSlug = createVariantSlug(
            product.baseSlug || product.slug,
            color.trim(),
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
            sku: opt.sku.trim(),
            slug: variantSlug,
          });

          await v.save({ session });
          newIds.push(v._id);
        }
      }

      product.variants = newIds;
      product.specifications.colors = [
        ...new Set(variantGroups.map((g) => g.color.trim())),
      ];
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
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    session.endSession();
  }
};

export const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const slug = id;
    const skuQuery = req.query.sku?.trim();

    let variant = await AppleWatchVariant.findOne({ slug });
    let product = null;

    if (variant) {
      product = await AppleWatch.findById(variant.productId)
        .populate("variants")
        .populate("createdBy", "fullName email");

      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy sản phẩm" });

      if (skuQuery) {
        const variantBySku = product.variants.find((v) => v.sku === skuQuery);
        if (variantBySku) variant = variantBySku;
      }
    } else {
      product = await AppleWatch.findOne({
        $or: [{ baseSlug: slug }, { slug: slug }],
      })
        .populate("variants")
        .populate("createdBy", "fullName email");

      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy sản phẩm" });

      const variants = product.variants || [];
      variant = variants.find((v) => v.stock > 0) || variants[0];

      if (!variant)
        return res
          .status(404)
          .json({ success: false, message: "Sản phẩm không có biến thể" });

      return res.json({
        success: true,
        redirect: true,
        redirectSlug: variant.slug,
        redirectSku: variant.sku,
        data: { product, selectedVariantSku: variant.sku },
      });
    }

    res.json({
      success: true,
      data: { product, selectedVariantSku: variant.sku },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Lỗi server" });
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
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });

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
