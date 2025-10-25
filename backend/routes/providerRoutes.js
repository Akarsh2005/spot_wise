const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const authMiddleware = require('../middleware/auth_middleware');

// Public routes
router.post('/register', providerController.registerProvider);
router.post('/login', providerController.loginProvider);

// Protected routes (need JWT)
router.get('/profile', authMiddleware, providerController.getProviderProfile);
router.put('/profile', authMiddleware, providerController.updateProviderProfile);

module.exports = router;
