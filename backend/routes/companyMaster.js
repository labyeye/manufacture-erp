const express = require('express');
const router = express.Router();
const companyMasterController = require('../controllers/companyMasterController');
const { auth } = require('../middleware/auth');

router.get('/', auth, companyMasterController.getAll);
router.get('/:id', auth, companyMasterController.getOne);
router.post('/', auth, companyMasterController.create);
router.put('/:id', auth, companyMasterController.update);
router.delete('/:id', auth, companyMasterController.delete);
router.patch('/:id/status', auth, companyMasterController.updateStatus);

module.exports = router;
