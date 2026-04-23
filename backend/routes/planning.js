const express = require('express');
const router = express.Router();
const { generateProductionCalendar, getProductionCalendar, planJob } = require('../controllers/planningController');

router.get('/generate', generateProductionCalendar);
router.get('/calendar', getProductionCalendar);
router.post('/plan-job', planJob);

module.exports = router;
