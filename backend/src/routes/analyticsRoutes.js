// backend/src/routes/analyticsRoutes.js
import express from 'express';
import { getTopProducts } from '../services/salesAnalyticsService.js';

const router = express.Router();

router.get('/top-products/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit } = req.query;
    const top = await getTopProducts(category, parseInt(limit) || 10);
    res.json({ success: true, data: top });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;