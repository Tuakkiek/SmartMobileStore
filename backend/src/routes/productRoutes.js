// routes/productRoutes.js
import express from 'express';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  updateQuantity,
  getCategories,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  bulkUpdateProducts,
  getProductStats,
  // NEW: Variant APIs
  createVariant,
  getVariantsByProduct,
  updateVariant,
  deleteVariant,
  getVariantById
} from '../controllers/productController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import * as productController from '../controllers/productController.js';

const router = express.Router();


router.get('/products', protect, restrictTo('WAREHOUSE_STAFF', 'ADMIN'), productController.getAllProducts);

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);

// NEW: Public Variant APIs
router.get('/:productId/variants', getVariantsByProduct); // ✅ /api/products/:id/variants
router.get('/variants/:variantId', getVariantById); // ✅ /api/products/variants/:variantId

// Protected routes - Warehouse Staff & Admin
router.use(protect);

// Statistics (Admin & Warehouse Staff)
router.get('/stats/overview', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), getProductStats);

// Product management
router.post('/', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), createProduct);
router.put('/:id', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), updateProduct);
router.delete('/:id', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), deleteProduct);
router.patch('/:id/quantity', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), updateQuantity);
router.post('/bulk-update', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), bulkUpdateProducts);

// NEW: Variant Management APIs
router.post('/:productId/variants', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), createVariant); // ✅ Tạo variant
router.put('/variants/:variantId', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), updateVariant); // ✅ Cập nhật
router.delete('/variants/:variantId', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), deleteVariant); // ✅ Xóa

export default router;