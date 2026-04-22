const express = require('express');
const router = express.Router();
const brandMasterController = require('../controllers/brandMasterController');
const { auth } = require('../middleware/auth');

router.get('/', auth, brandMasterController.getAll);
router.get('/:id', auth, brandMasterController.getOne);
router.post('/', auth, brandMasterController.create);
router.put('/:id', auth, brandMasterController.update);
router.delete('/:id', auth, brandMasterController.delete);
router.patch('/:id/status', auth, brandMasterController.updateStatus);

module.exports = router;
