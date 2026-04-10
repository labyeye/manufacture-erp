const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', auth, authController.me);
router.post('/logout', auth, authController.logout);

module.exports = router;
