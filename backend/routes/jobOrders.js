const express = require('express');
const router = express.Router();
const jobOrderController = require('../controllers/jobOrderController');
const { auth } = require('../middleware/auth');

// All routes are protected
router.get('/', auth, jobOrderController.getAll);
router.get('/:id', auth, jobOrderController.getOne);
router.post('/', auth, jobOrderController.create);
router.put('/:id', auth, jobOrderController.update);
router.delete('/:id', auth, jobOrderController.delete);
router.post('/:id/stage', auth, jobOrderController.addStage);
router.get('/:id/jobcard-pdf', auth, jobOrderController.getJobCardPDF);

module.exports = router;
