// controllers/productController.js - Extended version
import Product from '../models/Product.js';

// Get all categories with product counts
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all products with enhanced filtering
export const getAllProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      category,
      subcategory,
      status, 
      minPrice, 
      maxPrice, 
      sort,
      tags,
      inStock
    } = req.query;

    const query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by subcategory
    if (subcategory) {
      query.subcategory = subcategory;
    }

    // Search by name, model, or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by stock availability
    if (inStock === 'true') {
      query.quantity = { $gt: 0 };
      query.status = { $in: ['AVAILABLE', 'PRE_ORDER'] };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'popularity') sortOption = { totalReviews: -1 };

    const products = await Product.find(query)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'fullName');

    const count = await Product.countDocuments(query);

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
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, subcategory, sort = 'createdAt' } = req.query;

    const query = { category };
    
    if (subcategory) {
      query.subcategory = subcategory;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };

    const products = await Product.find(query)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
        total: count,
        category
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get featured/popular products
export const getFeaturedProducts = async (req, res) => {
  try {
    const { category, limit = 8 } = req.query;
    
    const query = {
      status: 'AVAILABLE',
      quantity: { $gt: 0 }
    };

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get new arrivals
export const getNewArrivals = async (req, res) => {
  try {
    const { category, limit = 8 } = req.query;
    
    const query = {
      status: { $in: ['AVAILABLE', 'PRE_ORDER'] }
    };

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'fullName');

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
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get related products
export const getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: 'AVAILABLE'
    })
    .limit(4)
    .sort({ averageRating: -1 });

    res.json({
      success: true,
      data: { products: relatedProducts }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Create product (Warehouse Staff)
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: { product }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update product (Warehouse Staff, Admin)
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: { product }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete product (Warehouse Staff)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update quantity (Warehouse Staff)
export const updateQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { quantity },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật số lượng thành công',
      data: { product }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Bulk update products
export const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updateData } = req.body;

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `Đã cập nhật ${result.modifiedCount} sản phẩm`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get product statistics by category
export const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          availableProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
          },
          totalQuantity: { $sum: '$quantity' },
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Add these functions to controllers/productController.js

// Bulk import products from JSON
export const bulkImportJSON = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required and must not be empty'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const productData of products) {
      try {
        // Add createdBy to each product
        const product = await Product.create({
          ...productData,
          createdBy: req.user._id
        });
        results.success.push({
          name: product.name,
          id: product._id
        });
      } catch (error) {
        results.failed.push({
          name: productData.name || 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Imported ${results.success.length} products successfully, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Bulk import products from CSV
export const bulkImportCSV = async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV data is required and must not be empty'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const row of csvData) {
      try {
        // Parse specifications from CSV
        const specifications = {};
        if (row.spec_color) specifications.color = row.spec_color;
        if (row.spec_storage) specifications.storage = row.spec_storage;
        if (row.spec_ram) specifications.ram = row.spec_ram;
        if (row.spec_screen) specifications.screen = row.spec_screen;
        if (row.spec_chip) specifications.chip = row.spec_chip;
        if (row.spec_camera) specifications.camera = row.spec_camera;
        if (row.spec_battery) specifications.battery = row.spec_battery;
        if (row.spec_weight) specifications.weight = row.spec_weight;
        if (row.spec_dimensions) specifications.dimensions = row.spec_dimensions;

        // Parse variants if provided
        let variants = [];
        if (row.variants) {
          try {
            variants = JSON.parse(row.variants);
          } catch (e) {
            // If variants is not valid JSON, skip it
          }
        }

        // Parse images
        let images = [];
        if (row.images) {
          images = row.images.split(',').map(img => img.trim()).filter(Boolean);
        }

        // Parse tags
        let tags = [];
        if (row.tags) {
          tags = row.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        }

        // Parse features
        let features = [];
        if (row.features) {
          features = row.features.split(',').map(f => f.trim()).filter(Boolean);
        }

        const productData = {
          name: row.name,
          category: row.category,
          subcategory: row.subcategory || '',
          model: row.model,
          specifications,
          variants,
          price: Number(row.price),
          originalPrice: Number(row.originalPrice),
          discount: Number(row.discount || 0),
          quantity: Number(row.quantity),
          status: row.status || 'AVAILABLE',
          images,
          description: row.description || '',
          features,
          tags,
          createdBy: req.user._id
        };

        const product = await Product.create(productData);
        results.success.push({
          name: product.name,
          id: product._id
        });
      } catch (error) {
        results.failed.push({
          name: row.name || 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Imported ${results.success.length} products successfully, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Export products to CSV format
export const exportToCSV = async (req, res) => {
  try {
    const { category, status } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;

    const products = await Product.find(query).lean();

    // Convert to CSV-friendly format
    const csvData = products.map(product => ({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || '',
      model: product.model,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount || 0,
      quantity: product.quantity,
      status: product.status,
      images: (product.images || []).join(','),
      description: product.description || '',
      tags: (product.tags || []).join(','),
      features: (product.features || []).join(','),
      spec_color: product.specifications?.color || '',
      spec_storage: product.specifications?.storage || '',
      spec_ram: product.specifications?.ram || '',
      spec_screen: product.specifications?.screen || '',
      spec_chip: product.specifications?.chip || '',
      spec_camera: product.specifications?.camera || '',
      spec_battery: product.specifications?.battery || '',
      spec_weight: product.specifications?.weight || '',
      spec_dimensions: product.specifications?.dimensions || '',
      variants: product.variants ? JSON.stringify(product.variants) : ''
    }));

    res.json({
      success: true,
      data: csvData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};