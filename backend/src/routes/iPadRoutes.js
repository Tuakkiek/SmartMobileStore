import express from 'express';
import iPadController from '../controllers/iPadController.js';

const router = express.Router();

router.post('/', iPadController.create);
router.get('/', iPadController.findAll);
router.get('/:id', iPadController.findOne);
router.put('/:id', iPadController.update);
router.delete('/:id', iPadController.deleteIPad);
router.get('/:id/variants', iPadController.getVariants);

export default router;
