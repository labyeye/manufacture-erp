const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');
const { auth } = require('../middleware/auth');


router.get('/', auth, poController.getAll);
router.get('/:id', auth, poController.getOne);
router.post('/', auth, poController.create);
router.put('/:id', auth, poController.update);
router.delete('/:id', auth, poController.deletePurchaseOrder);
router.patch('/:id/status', auth, poController.updateStatus);

module.exports = router;
