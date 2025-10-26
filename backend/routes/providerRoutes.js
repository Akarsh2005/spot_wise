const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const authMiddleware = require('../middleware/auth_middleware');

// Public routes
router.post('/register', providerController.registerProvider);
router.post('/login', providerController.loginProvider);

// Protected routes (requires JWT)
router.get('/profile', authMiddleware, providerController.getProviderProfile);
router.put('/profile', authMiddleware, providerController.updateProviderProfile);
router.put('/status', authMiddleware, providerController.updateProviderStatus);
router.get('/dashboard', authMiddleware, providerController.getProviderDashboardStats);
router.get('/earnings', authMiddleware, providerController.getProviderEarnings);

// New routes for seekers
router.get('/', providerController.getAllProviders); // get all providers
router.get('/:id', providerController.getProviderById); // get specific provider

module.exports = router;