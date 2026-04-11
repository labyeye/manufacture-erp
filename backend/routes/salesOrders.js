const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');
const { auth } = require('../middleware/auth');


router.get('/', auth, salesOrderController.getAll);
router.get('/:id', auth, salesOrderController.getOne);
router.post('/', auth, salesOrderController.create);
router.put('/:id', auth, salesOrderController.update);
router.delete('/:id', auth, salesOrderController.delete);
router.patch('/:id/status', auth, salesOrderController.updateStatus);

module.exports = router;
