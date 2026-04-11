const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const machineMasterController = require('../controllers/machineMasterController');


router.use(auth);


router.get('/', machineMasterController.getAllMachines);


router.get('/:id', machineMasterController.getMachineById);


router.post('/', machineMasterController.createMachine);


router.put('/:id', machineMasterController.updateMachine);


router.patch('/:id/status', machineMasterController.updateMachineStatus);


router.delete('/:id', machineMasterController.deleteMachine);

module.exports = router;
