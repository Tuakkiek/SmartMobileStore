const express = require('express');
const router = express.Router();
const controller = require('../controllers/iPhoneController');

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.get('/:id/variants', controller.getVariants);

module.exports = router;