// ============================================
// FILE: backend/src/modules/brand/brandController.js
// ✅ Controller cho Brand CRUD
// ============================================

import Brand from "./Brand.js";

// CREATE
export const create = async (req, res) => {
  try {
    console.log("📥 CREATE BRAND REQUEST:", req.body);

    const { name, logo, description, website, createdBy } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên hãng là bắt buộc",
      });
    }

    const existing = await Brand.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Hãng này đã tồn tại",
      });
    }

    const brand = await Brand.create({
      name: name.trim(),
      logo: logo?.trim() || "",
      description: description?.trim() || "",
      website: website?.trim() || "",
      createdBy,
    });

    console.log("✅ BRAND CREATED:", brand._id);

    res.status(201).json({
      success: true,
      message: "Tạo hãng thành công",
      data: { brand },
    });
  } catch (error) {
    console.error("❌ CREATE BRAND ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi tạo hãng",
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

    const brands = await Brand.find(query)
      .populate("createdBy", "fullName email")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(+limit);

    const total = await Brand.countDocuments(query);

    res.json({
      success: true,
      data: {
        brands,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: +page,
      },
    });
  } catch (error) {
    console.error("❌ GET BRANDS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy danh sách hãng",
    });
  }
};

// GET ONE
export const findOne = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).populate(
      "createdBy",
      "fullName email"
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hãng",
      });
    }

    res.json({
      success: true,
      data: { brand },
    });
  } catch (error) {
    console.error("❌ GET BRAND ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thông tin hãng",
    });
  }
};

// UPDATE
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo, description, website, status } = req.body;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hãng",
      });
    }

    // Check duplicate name
    if (name && name.trim() !== brand.name) {
      const existing = await Brand.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Tên hãng đã tồn tại",
        });
      }

      brand.name = name.trim();
      brand.slug = ""; // trigger auto-generate
    }

    if (logo !== undefined) brand.logo = logo.trim();
    if (description !== undefined) brand.description = description.trim();
    if (website !== undefined) brand.website = website.trim();
    if (status) brand.status = status;

    await brand.save();

    console.log("✅ BRAND UPDATED:", brand._id);

    res.json({
      success: true,
      message: "Cập nhật hãng thành công",
      data: { brand },
    });
  } catch (error) {
    console.error("❌ UPDATE BRAND ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật hãng",
    });
  }
};

// DELETE
export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hãng",
      });
    }

    await brand.deleteOne();

    console.log("✅ BRAND DELETED:", req.params.id);

    res.json({
      success: true,
      message: "Xóa hãng thành công",
    });
  } catch (error) {
    console.error("❌ DELETE BRAND ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi xóa hãng",
    });
  }
};

export default {
  create,
  findAll,
  findOne,
  update,
  deleteBrand,
};
