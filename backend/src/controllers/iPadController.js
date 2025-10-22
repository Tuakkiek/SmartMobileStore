// backend/src/controllers/iPadController.js
import IPad, { IPadVariant } from '../models/IPad.js';

// Create iPad with variants
export const create = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    
    // Create main product
    const product = new IPad(productData);
    
    // Create variants if provided
    if (variants && variants.length > 0) {
      const createdVariants = await Promise.all(
        variants.map(async (v) => {
          const variant = new IPadVariant({
            ...v,
            productId: product._id
          });
          await variant.save();
          return variant._id;
        })
      );
      product.variants = createdVariants;
    }
    
    await product.save();
    res.status(201).json({
      success: true,
      message: 'Tạo iPad thành công',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all iPads
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get iPad by ID
export const findOne = async (req, res) => {
  try {
    const product = await IPad.findById(req.params.id)
      .populate('variants')
      .populate('createdBy', 'fullName');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy iPad'
      });
    }
    
    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update iPad
export const update = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    
    const product = await IPad.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy iPad'
      });
    }
    
    // Update variants if provided
    if (variants) {
      // Delete old variants
      await IPadVariant.deleteMany({ productId: product._id });
      
      // Create new variants
      const createdVariants = await Promise.all(
        variants.map(async (v) => {
          const variant = new IPadVariant({
            ...v,
            productId: product._id
          });
          await variant.save();
          return variant._id;
        })
      );
      
      product.variants = createdVariants;
      await product.save();
    }
    
    res.json({
      success: true,
      message: 'Cập nhật iPad thành công',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete iPad
export const deleteIPad = async (req, res) => {
  try {
    const product = await IPad.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy iPad'
      });
    }
    
    // Delete all variants
    await IPadVariant.deleteMany({ productId: product._id });
    
    // Delete product
    await product.deleteOne();
    
    res.json({
      success: true,
      message: 'Xóa iPad thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get variants by product ID
export const getVariants = async (req, res) => {
  try {
    const variants = await IPadVariant.find({
      productId: req.params.id
    });
    
    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
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