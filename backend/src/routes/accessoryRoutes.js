// backend/src/routes/accessoryRoutes.js
import express from 'express';
import accessoryController from '../controllers/accessoryController.js';

const router = express.Router();

// Create a new accessory (with variants)
router.post('/', accessoryController.create);

// Get all accessories
router.get('/', accessoryController.findAll);

// Get accessory by ID
router.get('/:id', accessoryController.findOne);

// Update accessory by ID
router.put('/:id', accessoryController.update);

// Delete accessory by ID
router.delete('/:id', accessoryController.deleteAccessory);

// Get variants of a specific accessory by its ID
router.get('/:id/variants', accessoryController.getVariants);

export default router;
