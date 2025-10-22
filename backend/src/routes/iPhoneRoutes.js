import express from 'express';
import { Router } from 'express';
import controller from '../controllers/iPhoneController.js';

const router = Router();


router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.get('/:id/variants', controller.getVariants);

module.exports = router;