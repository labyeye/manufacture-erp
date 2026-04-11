const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const fgStockController = require('../controllers/fgStockController');


router.use(auth);


router.get('/', fgStockController.getAllStock);


router.get('/:id', fgStockController.getStockById);


router.post('/', fgStockController.createStock);


router.patch('/:id/adjust', fgStockController.adjustStock);


router.put('/:id', fgStockController.updateStock);


router.delete('/:id', fgStockController.deleteStock);

module.exports = router;
