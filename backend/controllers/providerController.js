// backend/controllers/providerController.js
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Provider from '../models/providermodel.js';
import Booking from '../models/bookingModel.js';

// 🔑 Generate JWT token for provider
const generateToken = (provider) => {
    return jwt.sign(
        { id: provider._id, role: 'provider' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// backend/controllers/providerController.js - Update registerProvider
export const registerProvider = async (req, res) => {
  try {
    const { name, email, contactNumber, password, skills, rate, address } = req.body;
    const existing = await Provider.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Provider already exists' });

    // 🔥 Get approximate location from address or use a default Indian city
    const defaultLocation = {
      type: 'Point',
      coordinates: [78.9629, 20.5937] // Default India coordinates
    };

    const provider = new Provider({ 
      name, email, contactNumber, password, skills, rate, address,
      location: defaultLocation // Use default instead of [0,0]
    });

    await provider.save();

    const token = generateToken(provider);
    res.status(201).json({ 
      message: 'Provider registered successfully', 
      token, 
      provider 
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// 🔐 Login Provider
export const loginProvider = async (req, res) => {
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

// 📍 Update Provider Location
export const updateProviderLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude)
            return res.status(400).json({ message: 'Latitude and longitude are required' });

        const provider = await Provider.findByIdAndUpdate(
            req.user.id,
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            },
            { new: true }
        ).select('-password');

        res.json({ message: 'Location updated successfully', provider });
    } catch (error) {
        console.error('Update Location Error:', error);
        res.status(500).json({ message: 'Server error updating location' });
    }
};

// backend/controllers/providerController.js - Update getProvidersNearby
export const getProvidersNearby = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50000 } = req.query; // Increased to 50km default
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    console.log('📍 Nearby query:', { latitude, longitude, maxDistance });

    // 🔥 Try geospatial query first
    let providers;
    try {
      providers = await Provider.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(maxDistance)
          }
        },
        status: { $in: ['online', 'active', 'offline'] } // Include offline too for testing
      }).select('-password -reviews');
    } catch (geoError) {
      console.log('Geospatial query failed, falling back to all providers:', geoError);
      // Fallback: get all providers if geospatial fails
      providers = await Provider.find({
        status: { $in: ['online', 'active', 'offline'] }
      }).select('-password -reviews');
    }

    console.log(`✅ Found ${providers.length} providers`);

    res.json({
      message: `Found ${providers.length} providers within ${maxDistance/1000}km`,
      providers,
      userLocation: { latitude, longitude }
    });
  } catch (error) {
    console.error('Get Nearby Providers Error:', error);
    
    // Final fallback: return all providers
    const allProviders = await Provider.find({
      status: { $in: ['online', 'active', 'offline'] }
    }).select('-password -reviews');
    
    res.json({
      message: `Found ${allProviders.length} providers (fallback)`,
      providers: allProviders,
      userLocation: { latitude, longitude }
    });
  }
};

// 👤 Get Provider Profile
export const getProviderProfile = async (req, res) => {
    try {
        const provider = await Provider.findById(req.user.id).select('-password');
        if (!provider) return res.status(404).json({ message: 'Provider not found' });
        res.json(provider);
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// ✏️ Update Provider Profile
export const updateProviderProfile = async (req, res) => {
    try {
        const updates = req.body;
        const provider = await Provider.findByIdAndUpdate(req.user.id, updates, {
            new: true,
        }).select('-password');
        res.json({ message: 'Profile updated successfully', provider });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// 🔄 Update Provider Status
export const updateProviderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['online', 'offline', 'in-progress'].includes(status))
            return res.status(400).json({ message: 'Invalid status' });

        const provider = await Provider.findByIdAndUpdate(req.user.id, { status }, { new: true });
        res.json({ message: 'Status updated', provider });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Server error updating status' });
    }
};

// 📊 Dashboard Stats
export const getProviderDashboardStats = async (req, res) => {
    try {
        const providerId = req.user.id;

        const totalBookings = await Booking.countDocuments({ provider: providerId });
        const completedBookings = await Booking.countDocuments({
            provider: providerId,
            status: 'Completed',
        });
        const pendingBookings = await Booking.countDocuments({
            provider: providerId,
            status: 'Pending',
        });

        const earningsAgg = await Booking.aggregate([
            {
                $match: {
                    provider: new mongoose.Types.ObjectId(providerId),
                    paymentStatus: 'Paid',
                },
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const totalEarnings = earningsAgg.length ? earningsAgg[0].total : 0;

        const notifications = await Booking.find({
            provider: providerId,
            status: 'Pending',
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('seeker', 'userName');

        res.json({
            totalBookings,
            completedBookings,
            pendingBookings,
            totalEarnings,
            notifications,
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

// 💰 Earnings History
export const getProviderEarnings = async (req, res) => {
    try {
        const providerId = req.user.id;
        const earnings = await Booking.aggregate([
            {
                $match: {
                    provider: new mongoose.Types.ObjectId(providerId),
                    paymentStatus: 'Paid',
                },
            },
            {
                $group: {
                    _id: { month: { $month: '$date' }, year: { $year: '$date' } },
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
        ]);

        res.json({ earnings });
    } catch (error) {
        console.error('Earnings Error:', error);
        res.status(500).json({ message: 'Error fetching earnings' });
    }
};

// 🌍 Fetch all Providers (public for seekers)
export const getAllProviders = async (req, res) => {
    try {
        const providers = await Provider.find().select('-password -reviews');
        res.json(providers);
    } catch (error) {
        console.error('Get All Providers Error:', error);
        res.status(500).json({ message: 'Server error fetching providers' });
    }
};

// 🔎 Fetch Provider by ID
export const getProviderById = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.id).select('-password -reviews');
        if (!provider) return res.status(404).json({ message: 'Provider not found' });
        res.json(provider);
    } catch (error) {
        console.error('Get Provider By ID Error:', error);
        res.status(500).json({ message: 'Server error fetching provider' });
    }
};

// backend/controllers/providerController.js - Add this function
export const debugProviders = async (req, res) => {
  try {
    const providers = await Provider.find().select('name location status');
    const providersWithLocation = providers.filter(p => 
      p.location && 
      p.location.coordinates[0] !== 0 && 
      p.location.coordinates[1] !== 0
    );
    
    res.json({
      totalProviders: providers.length,
      providersWithLocation: providersWithLocation.length,
      allProviders: providers.map(p => ({
        name: p.name,
        location: p.location,
        status: p.status
      }))
    });
  } catch (error) {
    console.error('Debug Error:', error);
    res.status(500).json({ message: 'Debug error' });
  }
};