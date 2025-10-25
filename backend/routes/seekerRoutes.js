const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const authMiddleware = require('../middleware/auth_middleware');

// Public routes
router.post('/register', seekerController.registerSeeker);
router.post('/login', seekerController.loginSeeker);

// Protected routes (need JWT)
router.get('/profile', authMiddleware, seekerController.getSeekerProfile);
router.put('/profile', authMiddleware, seekerController.updateSeekerProfile);

module.exports = router;
