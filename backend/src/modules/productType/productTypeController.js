// ============================================
// FILE: backend/src/modules/productType/productTypeController.js
// ============================================

import ProductType from "./ProductType.js";
import UniversalProduct from "../product/UniversalProduct.js";

// CREATE
export const create = async (req, res) => {
  try {
    console.log("📥 CREATE PRODUCT TYPE REQUEST:", req.body);

    const { name, description, icon, specFields, createdBy } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên loại sản phẩm là bắt buộc",
      });
    }

    const existing = await ProductType.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Loại sản phẩm này đã tồn tại",
      });
    }

    const productType = await ProductType.create({
      name: name.trim(),
      description: description?.trim() || "",
      icon: icon?.trim() || "",
      specFields: specFields || [],
      createdBy,
    });

    console.log("✅ PRODUCT TYPE CREATED:", productType._id);

    res.status(201).json({
      success: true,
      message: "Tạo loại sản phẩm thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ CREATE PRODUCT TYPE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi tạo loại sản phẩm",
    });
  }
};

// GET ALL
export const findAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status } = req.query;

    const query = {};
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { slug: { $regex: search.trim(), $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const productTypes = await ProductType.find(query)
      .populate("createdBy", "fullName email")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(+limit);

    const total = await ProductType.countDocuments(query);
    const productTypeIds = productTypes.map((item) => item._id);

    let usageMap = new Map();
    if (productTypeIds.length) {
      const usageStats = await UniversalProduct.aggregate([
        { $match: { productType: { $in: productTypeIds } } },
        {
          $group: {
            _id: "$productType",
            associatedProductsCount: { $sum: 1 },
          },
        },
      ]);

      usageMap = new Map(
        usageStats.map((item) => [
          String(item._id),
          item.associatedProductsCount || 0,
        ])
      );
    }

    const productTypesWithUsage = productTypes.map((productType) => {
      const associatedProductsCount =
        usageMap.get(String(productType._id)) || 0;

      return {
        ...productType.toObject(),
        associatedProductsCount,
        canDelete: associatedProductsCount === 0,
      };
    });

    res.json({
      success: true,
      data: {
        productTypes: productTypesWithUsage,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: +page,
      },
    });
  } catch (error) {
    console.error("❌ GET PRODUCT TYPES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy danh sách loại sản phẩm",
    });
  }
};

// GET ONE
export const findOne = async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id).populate(
      "createdBy",
      "fullName email"
    );

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    res.json({
      success: true,
      data: { productType },
    });
  } catch (error) {
    console.error("❌ GET PRODUCT TYPE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thông tin loại sản phẩm",
    });
  }
};

// UPDATE
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, specFields, status } = req.body;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    if (name && name.trim() !== productType.name) {
      const existing = await ProductType.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Tên loại sản phẩm đã tồn tại",
        });
      }

      productType.name = name.trim();
      productType.slug = "";
    }

    if (description !== undefined) productType.description = description.trim();
    if (icon !== undefined) productType.icon = icon.trim();
    if (specFields !== undefined) productType.specFields = specFields;
    if (status) productType.status = status;

    await productType.save();

    console.log("✅ PRODUCT TYPE UPDATED:", productType._id);

    res.json({
      success: true,
      message: "Cập nhật loại sản phẩm thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ UPDATE PRODUCT TYPE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật loại sản phẩm",
    });
  }
};

// DELETE
export const deleteProductType = async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    const associatedProductsCount = await UniversalProduct.countDocuments({
      productType: productType._id,
    });

    if (associatedProductsCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This product type cannot be deleted because it is currently in use by one or more products.",
        data: { associatedProductsCount },
      });
    }

    await productType.deleteOne();

    console.log("✅ PRODUCT TYPE DELETED:", req.params.id);

    res.json({
      success: true,
      message: "Xóa loại sản phẩm thành công",
    });
  } catch (error) {
    console.error("❌ DELETE PRODUCT TYPE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi xóa loại sản phẩm",
    });
  }
};

export default {
  create,
  findAll,
  findOne,
  update,
  deleteProductType,
};
