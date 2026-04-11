const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { auth } = require('../middleware/auth');

// All routes are protected
router.get('/', auth, dispatchController.getAll);
router.get('/:id', auth, dispatchController.getOne);
router.post('/', auth, dispatchController.create);
router.put('/:id', auth, dispatchController.update);
router.delete('/:id', auth, dispatchController.delete);

module.exports = router;
