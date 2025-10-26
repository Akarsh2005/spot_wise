const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Provider = require('../models/providermodel');
const Booking = require('../models/bookingModel');

// JWT token generator
const generateToken = (provider) => {
    return jwt.sign({ id: provider._id, role: 'provider' }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register Provider
exports.registerProvider = async (req, res) => {
    try {
        const { name, email, contactNumber, password, skills, rate, address } = req.body;
        const existing = await Provider.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Provider already exists' });

        const provider = new Provider({ name, email, contactNumber, password, skills, rate, address });
        await provider.save();

        const token = generateToken(provider);
        res.status(201).json({ message: 'Provider registered successfully', token, provider });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login Provider
exports.loginProvider = async (req, res) => {
    try {
        const { email, password } = req.body;
        const provider = await Provider.findOne({ email });
        if (!provider) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await provider.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = generateToken(provider);
        res.json({ message: 'Login successful', token, provider });
    } catch (error) {
        console.error('Login Error:', error);
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
        console.error('Profile Error:', error);
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
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// Toggle Provider Status
exports.updateProviderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!["online","offline","in-progress"].includes(status)) return res.status(400).json({ message: "Invalid status" });

        const provider = await Provider.findByIdAndUpdate(req.user.id, { status }, { new: true });
        res.json({ message: "Status updated", provider });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Server error updating status' });
    }
};

// Dashboard Stats
exports.getProviderDashboardStats = async (req, res) => {
    try {
        const providerId = req.user.id;
        const totalBookings = await Booking.countDocuments({ provider: providerId });
        const completedBookings = await Booking.countDocuments({ provider: providerId, status: "Completed" });
        const pendingBookings = await Booking.countDocuments({ provider: providerId, status: "Pending" });
        const earningsAgg = await Booking.aggregate([
            { $match: { provider: new mongoose.Types.ObjectId(providerId), paymentStatus: "Paid" } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalEarnings = earningsAgg.length ? earningsAgg[0].total : 0;

        // Add notifications (recent pending bookings)
        const notifications = await Booking.find({ provider: providerId, status: "Pending" })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('seeker', 'userName');

        res.json({ totalBookings, completedBookings, pendingBookings, totalEarnings, notifications });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

// Earnings History
exports.getProviderEarnings = async (req, res) => {
    try {
        const providerId = req.user.id;
        const earnings = await Booking.aggregate([
            { $match: { provider: new mongoose.Types.ObjectId(providerId), paymentStatus: "Paid" } },
            { $group: { _id: { month: { $month: "$date" }, year: { $year: "$date" } }, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);
        res.json({ earnings });
    } catch (error) {
        console.error('Earnings Error:', error);
        res.status(500).json({ message: 'Error fetching earnings' });
    }
};

// Fetch all providers (public, for seekers)
exports.getAllProviders = async (req, res) => {
    try {
        const providers = await Provider.find().select('-password -reviews');
        res.json(providers);
    } catch (error) {
        console.error('Get All Providers Error:', error);
        res.status(500).json({ message: 'Server error fetching providers' });
    }
};

// Fetch specific provider by ID
exports.getProviderById = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.id).select('-password -reviews');
        if (!provider) return res.status(404).json({ message: 'Provider not found' });
        res.json(provider);
    } catch (error) {
        console.error('Get Provider By ID Error:', error);
        res.status(500).json({ message: 'Server error fetching provider' });
    }
};