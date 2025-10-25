const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Provider = require('../models/providermodel');

// Generate JWT token
const generateToken = (provider) => {
    return jwt.sign(
        { id: provider._id, role: 'provider' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Register Provider
exports.registerProvider = async (req, res) => {
    try {
        const { name, email, contactNumber, password, skills, rate, address, location } = req.body;

        let existingProvider = await Provider.findOne({ email });
        if (existingProvider) {
            return res.status(400).json({ message: 'Provider already exists' });
        }

        const provider = new Provider({
            name,
            email,
            contactNumber,
            password,
            skills,
            rate,
            address,
            location
        });

        await provider.save();

        const token = generateToken(provider);
        res.status(201).json({
            message: 'Provider registered successfully',
            token,
            provider
        });
    } catch (error) {
        console.error('Register Provider Error:', error);
        res.status(500).json({ message: 'Server error during provider registration' });
    }
};

// Login Provider
exports.loginProvider = async (req, res) => {
    try {
        const { email, password } = req.body;
        const provider = await Provider.findOne({ email });

        if (!provider) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, provider.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(provider);
        res.json({ message: 'Login successful', token, provider });
    } catch (error) {
        console.error('Login Provider Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Get Provider Profile
exports.getProviderProfile = async (req, res) => {
    try {
        const provider = await Provider.findById(req.user.id).select('-password');
        if (!provider) return res.status(404).json({ message: 'Provider not found' });

        res.json(provider);
    } catch (error) {
        console.error('Get Provider Profile Error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// Update Provider Profile
exports.updateProviderProfile = async (req, res) => {
    try {
        const updates = req.body;
        const provider = await Provider.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.json({ message: 'Profile updated successfully', provider });
    } catch (error) {
        console.error('Update Provider Profile Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};
