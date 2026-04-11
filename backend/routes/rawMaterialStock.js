const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const rawMaterialStockController = require('../controllers/rawMaterialStockController');


router.use(auth);


router.get('/', rawMaterialStockController.getAllStock);


router.get('/low-stock', rawMaterialStockController.getLowStock);


router.get('/:id', rawMaterialStockController.getStockById);


router.post('/', rawMaterialStockController.createStock);


router.patch('/:id/adjust', rawMaterialStockController.adjustStock);


router.put('/:id', rawMaterialStockController.updateStock);


router.delete('/:id', rawMaterialStockController.deleteStock);

module.exports = router;
