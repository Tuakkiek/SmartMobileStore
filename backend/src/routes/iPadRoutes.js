import express from 'express';
import iPadController from '../controllers/iPadController.js';

const router = express.Router();

// Route để tạo mới iPad
router.post('/', iPadController.create);

// Route để lấy tất cả các iPad
router.get('/', iPadController.findAll);

// Route để lấy thông tin chi tiết một iPad theo ID
router.get('/:id', iPadController.findOne);

// Route để cập nhật thông tin của một iPad theo ID
router.put('/:id', iPadController.update);

// Route để xóa một iPad theo ID
router.delete('/:id', iPadController.deleteIPad);

// Route để lấy tất cả các variants của một iPad
router.get('/:id/variants', iPadController.getVariants);

export default router;
