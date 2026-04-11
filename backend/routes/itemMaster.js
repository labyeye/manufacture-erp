const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const itemMasterController = require('../controllers/itemMasterController');


router.use(auth);


router.get('/', itemMasterController.getAllItems);


router.get('/:id', itemMasterController.getItemById);


router.post('/', itemMasterController.createItem);


router.post('/bulk-import', itemMasterController.bulkImport);


router.put('/:id', itemMasterController.updateItem);


router.patch('/:id/status', itemMasterController.updateItemStatus);


router.delete('/:id', itemMasterController.deleteItem);

module.exports = router;
