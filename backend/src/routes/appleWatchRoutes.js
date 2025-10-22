import express from 'express';
import * as controller from '../controllers/appleWatchController.js';

const router = express.Router();

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.deleteAppleWatch);
router.get('/:id/variants', controller.getVariants);

export default router;