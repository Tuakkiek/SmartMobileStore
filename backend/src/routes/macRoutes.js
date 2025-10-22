// backend/src/routes/macRoutes.js
import express from 'express';
import * as macController from '../controllers/macController.js'; // Đảm bảo tên file controller đúng

const router = express.Router();

// Route để tạo mới Mac
router.post('/', macController.create);

// Route để lấy tất cả các Mac
router.get('/', macController.findAll);

// Route để lấy thông tin chi tiết một Mac theo ID
router.get('/:id', macController.findOne);

// Route để cập nhật thông tin của một Mac theo ID
router.put('/:id', macController.update);

// Route để xóa một Mac theo ID
router.delete('/:id', macController.deleteMac);

// Route để lấy tất cả các variants của một Mac
router.get('/:id/variants', macController.getVariants);

export default router;
