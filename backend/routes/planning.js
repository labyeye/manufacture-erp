const express = require('express');
const router = express.Router();
const { generateProductionCalendar, getProductionCalendar } = require('../controllers/planningController');

router.post('/generate', generateProductionCalendar);
router.get('/calendar', getProductionCalendar);

module.exports = router;
