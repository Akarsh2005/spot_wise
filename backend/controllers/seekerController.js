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
        const { userName, email, contactNumber, password, address, location } = req.body;

        let existingSeeker = await Seeker.findOne({ email });
        if (existingSeeker) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const seeker = new Seeker({
            userName,
            email,
            contactNumber,
            password,
            address,
            location
        });

        await seeker.save();

        const token = generateToken(seeker);
        res.status(201).json({
            message: 'Seeker registered successfully',
            token,
            seeker
        });
    } catch (error) {
        console.error('Register Seeker Error:', error);
        res.status(500).json({ message: 'Server error during seeker registration' });
    }
};

// Login Seeker
exports.loginSeeker = async (req, res) => {
    try {
        const { email, password } = req.body;
        const seeker = await Seeker.findOne({ email });

        if (!seeker) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, seeker.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(seeker);
        res.json({ message: 'Login successful', token, seeker });
    } catch (error) {
        console.error('Login Seeker Error:', error);
        res.status(500).json({ message: 'Server error during login' });
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
        res.status(500).json({ message: 'Server error fetching profile' });
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
        res.status(500).json({ message: 'Server error updating profile' });
    }
};
