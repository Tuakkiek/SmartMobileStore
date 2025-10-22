// backend/src/controllers/appleWatchController.js
import AppleWatch, { AppleWatchVariant } from '../models/AppleWatch.js';

// Create Apple Watch with variants
export const create = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    
    // Create main product
    const product = new AppleWatch(productData);
    
    // Create variants if provided
    if (variants && variants.length > 0) {
      const createdVariants = await Promise.all(
        variants.map(async (v) => {
          const variant = new AppleWatchVariant({
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
      message: 'Tạo Apple Watch thành công',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all Apple Watches
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
    
    const products = await AppleWatch.find(query)
      .populate('variants')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await AppleWatch.countDocuments(query);
    
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

// Get Apple Watch by ID
export const findOne = async (req, res) => {
  try {
    const product = await AppleWatch.findById(req.params.id)
      .populate('variants')
      .populate('createdBy', 'fullName');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Apple Watch'
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

// Update Apple Watch
export const update = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    
    const product = await AppleWatch.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Apple Watch'
      });
    }
    
    // Update variants if provided
    if (variants) {
      // Delete old variants
      await AppleWatchVariant.deleteMany({ productId: product._id });
      
      // Create new variants
      const createdVariants = await Promise.all(
        variants.map(async (v) => {
          const variant = new AppleWatchVariant({
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
      message: 'Cập nhật Apple Watch thành công',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete Apple Watch
export const deleteAppleWatch = async (req, res) => {
  try {
    const product = await AppleWatch.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Apple Watch'
      });
    }
    
    // Delete all variants
    await AppleWatchVariant.deleteMany({ productId: product._id });
    
    // Delete product
    await product.deleteOne();
    
    res.json({
      success: true,
      message: 'Xóa Apple Watch thành công'
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
    const variants = await AppleWatchVariant.find({
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
  deleteAppleWatch,
  getVariants
};