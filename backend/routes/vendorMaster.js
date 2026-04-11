const express = require('express');
const router = express.Router();
const vendorMasterController = require('../controllers/vendorMasterController');
const { auth } = require('../middleware/auth');


router.get('/', auth, vendorMasterController.getAll);
router.get('/:id', auth, vendorMasterController.getOne);
router.post('/', auth, vendorMasterController.create);
router.put('/:id', auth, vendorMasterController.update);
router.delete('/:id', auth, vendorMasterController.delete);
router.patch('/:id/status', auth, vendorMasterController.updateStatus);

module.exports = router;
