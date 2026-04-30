const express = require('express');
const router = express.Router();
const { generateProductionCalendar, getProductionCalendar, planJob, shiftMissed, shiftEntry } = require('../controllers/planningController');

router.get('/generate', generateProductionCalendar);
router.get('/calendar', getProductionCalendar);
router.post('/plan-job', planJob);
router.post('/shift-missed', shiftMissed);
router.post('/shift-entry', shiftEntry);

module.exports = router;
