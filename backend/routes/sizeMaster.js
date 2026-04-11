const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const sizeMasterController = require('../controllers/sizeMasterController');


router.use(auth);


router.get('/', sizeMasterController.getAllSizes);


router.get('/:category', sizeMasterController.getSizesByCategory);


router.post('/add', sizeMasterController.addSize);


router.put('/update', sizeMasterController.updateSize);


router.delete('/delete', sizeMasterController.deleteSize);


router.delete('/category/:category', sizeMasterController.deleteCategory);

module.exports = router;
