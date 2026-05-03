const express = require('express');
const router = express.Router();
const {
  generateProductionCalendar,
  getProductionCalendar,
  planJob,
  shiftMissed,
  shiftEntry,
  approveRush,
  setupPreventiveMaintenance,
} = require('../controllers/planningController');

router.get('/generate', generateProductionCalendar);
router.get('/calendar', getProductionCalendar);
router.post('/plan-job', planJob);
router.post('/shift-missed', shiftMissed);
router.post('/shift-entry', shiftEntry);
router.post('/approve-rush', approveRush);
router.post('/setup-pm', setupPreventiveMaintenance);

module.exports = router;
