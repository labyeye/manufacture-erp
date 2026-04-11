const express = require('express');
const router = express.Router();
const clientMasterController = require('../controllers/clientMasterController');
const { auth } = require('../middleware/auth');


router.get('/', auth, clientMasterController.getAll);
router.get('/:id', auth, clientMasterController.getOne);
router.post('/', auth, clientMasterController.create);
router.put('/:id', auth, clientMasterController.update);
router.delete('/:id', auth, clientMasterController.delete);
router.patch('/:id/status', auth, clientMasterController.updateStatus);

module.exports = router;
