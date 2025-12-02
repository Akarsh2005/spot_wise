// backend/routes/providerRoutes.js
import express from 'express';
import {
  registerProvider,
  loginProvider,
  getProviderProfile,
  updateProviderProfile,
  updateProviderStatus,
  getProviderDashboardStats,
  getProviderEarnings,
  getAllProviders,
  getProviderById,
  updateProviderLocation,  // 🔥 NEW
  getProvidersNearby,      // 🔥 NEW
  debugProviders
} from '../controllers/providerController.js';
import authMiddleware from '../middleware/auth_middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerProvider);
router.post('/login', loginProvider);
router.get('/nearby', getProvidersNearby); // 🔥 NEW: Public route for nearby providers

// Protected routes (requires JWT)
router.get('/profile', authMiddleware, getProviderProfile);
router.put('/profile', authMiddleware, updateProviderProfile);
router.put('/status', authMiddleware, updateProviderStatus);
router.put('/location', authMiddleware, updateProviderLocation); // 🔥 NEW: Update location
router.get('/dashboard', authMiddleware, getProviderDashboardStats);
router.get('/earnings', authMiddleware, getProviderEarnings);

// Keep existing routes for backward compatibility
router.get('/', getAllProviders); // get all providers
router.get('/:id', getProviderById); // get specific provider

// backend/routes/providerRoutes.js - Add this route
router.get('/debug/providers',debugProviders);

export default router;