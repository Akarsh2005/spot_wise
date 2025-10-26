const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const authMiddleware = require('../middleware/auth_middleware');

// Public Routes
router.post('/register', seekerController.registerSeeker);
router.post('/login', seekerController.loginSeeker);

// Protected Routes
router.get('/profile', authMiddleware, seekerController.getSeekerProfile);
router.put('/profile', authMiddleware, seekerController.updateSeekerProfile);

// Saved Providers
router.post('/savedProviders/:providerId', authMiddleware, seekerController.addSavedProvider);
router.delete('/savedProviders/:providerId', authMiddleware, seekerController.removeSavedProvider);

module.exports = router;