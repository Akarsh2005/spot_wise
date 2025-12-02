import express from 'express';
import {
  registerSeeker,
  loginSeeker,
  getSeekerProfile,
  updateSeekerProfile,
  addSavedProvider,
  removeSavedProvider
} from '../controllers/seekerController.js';
import authMiddleware from '../middleware/auth_middleware.js';

const router = express.Router();

// Public Routes
router.post('/register', registerSeeker);
router.post('/login', loginSeeker);

// Protected Routes
router.get('/profile', authMiddleware, getSeekerProfile);
router.put('/profile', authMiddleware, updateSeekerProfile);

// Saved Providers
router.post('/savedProviders/:providerId', authMiddleware, addSavedProvider);
router.delete('/savedProviders/:providerId', authMiddleware, removeSavedProvider);

export default router;
