// backend/src/routes/airPodsRoutes.js
import express from 'express';
import airPodsController from '../controllers/airPodsController.js';

const router = express.Router();

// Create a new AirPods (with variants)
router.post('/', airPodsController.create);

// Get all AirPods
router.get('/', airPodsController.findAll);

// Get AirPods by ID
router.get('/:id', airPodsController.findOne);

// Update AirPods by ID
router.put('/:id', airPodsController.update);

// Delete AirPods by ID
router.delete('/:id', airPodsController.deleteAirPods);

// Get variants of a specific AirPods by its ID
router.get('/:id/variants', airPodsController.getVariants);

export default router;
