// routes/productRoutes.js - Extended version
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
  getProductStats
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

export default router;