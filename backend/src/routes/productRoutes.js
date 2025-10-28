// src/routes/productRoutes.js
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
  createVariant,
  getVariantsByProduct,
  updateVariant,
  deleteVariant,
  getVariantById,
  getSpecificVariant  // New
} from '../controllers/productController.js';

import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);
router.get('/:productId/variants', getVariantsByProduct);
router.get('/variants/:variantId', getVariantById);
router.get('/variants', getSpecificVariant);  // New: /api/products/variants?productId=...&color=...&storage=...

// Protected routes
router.use(protect);
router.get('/stats/overview', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), getProductStats);
router.post('/', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), createProduct);
router.put('/:id', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), updateProduct);
router.delete('/:id', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), deleteProduct);
router.patch('/:id/quantity', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), updateQuantity);
router.post('/bulk-update', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), bulkUpdateProducts);
router.post('/:productId/variants', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), createVariant);
router.put('/variants/:variantId', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), updateVariant);
router.delete('/variants/:variantId', restrictTo('WAREHOUSE_STAFF', 'ADMIN'), deleteVariant);

export default router;