const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Seeker = require('../models/seekermodel');

// Generate JWT token
const generateToken = (seeker) => {
    return jwt.sign(
        { id: seeker._id, role: 'seeker' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Register Seeker
exports.registerSeeker = async (req, res) => {
    try {
        const { userName, email, contactNumber, password, address } = req.body;

        // Validate address fields
        if (!address || !address.street || !address.city || !address.state || !address.postalCode || !address.country) {
            return res.status(400).json({ message: 'All address fields are required' });
        }

        const existingSeeker = await Seeker.findOne({ email });
        if (existingSeeker) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const seeker = new Seeker({ userName, email, contactNumber, password, address });
        await seeker.save();

        const token = generateToken(seeker);
        res.status(201).json({
            message: 'Seeker registered successfully',
            token,
            seeker
        });
    } catch (error) {
        console.error('Register Seeker Error:', error);
        res.status(500).json({ message: 'Server error during seeker registration', error: error.message });
    }
};

// Login Seeker
exports.loginSeeker = async (req, res) => {
    try {
        const { email, password } = req.body;
        const seeker = await Seeker.findOne({ email });

        if (!seeker) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await seeker.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = generateToken(seeker);
        res.json({ message: 'Login successful', token, seeker });
    } catch (error) {
        console.error('Login Seeker Error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// Get Seeker Profile
exports.getSeekerProfile = async (req, res) => {
    try {
        const seeker = await Seeker.findById(req.user.id).select('-password');
        if (!seeker) return res.status(404).json({ message: 'Seeker not found' });

        res.json(seeker);
    } catch (error) {
        console.error('Get Seeker Profile Error:', error);
        res.status(500).json({ message: 'Server error fetching profile', error: error.message });
    }
};

// Update Seeker Profile
exports.updateSeekerProfile = async (req, res) => {
    try {
        const updates = req.body;
        const seeker = await Seeker.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.json({ message: 'Profile updated successfully', seeker });
    } catch (error) {
        console.error('Update Seeker Profile Error:', error);
        res.status(500).json({ message: 'Server error updating profile', error: error.message });
    }
};

// Add a Provider to savedProviders
exports.addSavedProvider = async (req, res) => {
    try {
        const seeker = await Seeker.findById(req.user.id);
        const providerId = req.params.providerId;

        if (!seeker.savedProviders.includes(providerId)) {
            seeker.savedProviders.push(providerId);
            await seeker.save();
        }

        res.json({ message: 'Provider added to saved list', savedProviders: seeker.savedProviders });
    } catch (error) {
        console.error('Add Saved Provider Error:', error);
        res.status(500).json({ message: 'Error adding provider', error: error.message });
    }
};

// Remove a Provider from savedProviders
exports.removeSavedProvider = async (req, res) => {
    try {
        const seeker = await Seeker.findById(req.user.id);
        const providerId = req.params.providerId;

        seeker.savedProviders = seeker.savedProviders.filter(id => id.toString() !== providerId);
        await seeker.save();

        res.json({ message: 'Provider removed from saved list', savedProviders: seeker.savedProviders });
    } catch (error) {
        console.error('Remove Saved Provider Error:', error);
        res.status(500).json({ message: 'Error removing provider', error: error.message });
    }
};