const express = require('express');
const router = express.Router();
const { generateProductionCalendar, getProductionCalendar, planJob, shiftMissed } = require('../controllers/planningController');

router.get('/generate', generateProductionCalendar);
router.get('/calendar', getProductionCalendar);
router.post('/plan-job', planJob);
router.post('/shift-missed', shiftMissed);

module.exports = router;
