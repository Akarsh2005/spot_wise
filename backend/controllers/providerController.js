// controllers/providerController.js
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Provider from "../models/providermodel.js";
import Booking from "../models/bookingModel.js";

// 🔑 Generate JWT token
const generateToken = (provider) => {
  return jwt.sign(
    { id: provider._id, role: "provider" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ✅ Register Provider
export const registerProvider = async (req, res) => {
  try {
    const { name, email, contactNumber, password, skills, rate, address } = req.body;

    if (!name || !email || !password || !skills || skills.length === 0)
      return res.status(400).json({ message: "Name, email, password, and skills are required" });

    const existing = await Provider.findOne({ email });
    if (existing) return res.status(400).json({ message: "Provider already exists" });

    const provider = new Provider({
      name,
      email,
      contactNumber,
      password,
      skills,
      rate,
      address,
      // FIX: Do not default to [0,0] India coords — wait for real GPS location
      location: { type: "Point", coordinates: [0, 0] },
      locationSet: false,
    });

    await provider.save();

    const token = generateToken(provider);
    res.status(201).json({
      message: "Provider registered successfully. Please update your location.",
      token,
      provider: { ...provider.toObject(), password: undefined },
    });
  } catch (error) {
    console.error("Register Provider Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ✅ Login Provider
export const loginProvider = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const provider = await Provider.findOne({ email });
    if (!provider) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await provider.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(provider);
    res.json({
      message: "Login successful",
      token,
      provider: { ...provider.toObject(), password: undefined },
    });
  } catch (error) {
    console.error("Login Provider Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// 📍 Update Provider Location
export const updateProviderLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined)
      return res.status(400).json({ message: "Latitude and longitude are required" });

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
      return res.status(400).json({ message: "Invalid coordinates" });

    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        locationSet: true,
      },
      { new: true }
    ).select("-password");

    if (!provider) return res.status(404).json({ message: "Provider not found" });

    res.json({ message: "Location updated successfully", provider });
  } catch (error) {
    console.error("Update Provider Location Error:", error);
    res.status(500).json({ message: "Server error updating location" });
  }
};

// 📍 Get Providers Nearby (used by seekers on map)
// FIX: Only query providers who have set a real location (locationSet: true)
// FIX: Removed catch fallback that was returning ALL providers regardless of distance
export const getProvidersNearby = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000, skill } = req.query;

    if (!latitude || !longitude)
      return res.status(400).json({ message: "Latitude and longitude are required" });

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const dist = parseInt(maxDistance);

    if (isNaN(lat) || isNaN(lng) || isNaN(dist))
      return res.status(400).json({ message: "Invalid query parameters" });

    // Build filter — only real locations, only online providers
    const filter = {
      locationSet: true,
      "location.coordinates": { $ne: [0, 0] },
      status: "online",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: dist,
        },
      },
    };

    // Optional skill filter
    if (skill) filter.skills = { $in: [new RegExp(skill, "i")] };

    const providers = await Provider.find(filter).select("-password -reviews");

    res.json({
      message: `Found ${providers.length} provider(s) within ${dist / 1000}km`,
      count: providers.length,
      providers,
      userLocation: { latitude: lat, longitude: lng },
    });
  } catch (error) {
    console.error("Get Nearby Providers Error:", error);
    res.status(500).json({ message: "Server error fetching nearby providers" });
  }
};

// 👤 Get Provider Profile
export const getProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findById(req.user.id).select("-password");
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (error) {
    console.error("Get Provider Profile Error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// ✏️ Update Provider Profile
// FIX: Whitelist only safe fields — prevents mass assignment (verified, rating, role)
export const updateProviderProfile = async (req, res) => {
  try {
    const { name, contactNumber, skills, rate, address } = req.body;

    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      { name, contactNumber, skills, rate, address },
      { new: true, runValidators: true }
    ).select("-password");

    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json({ message: "Profile updated successfully", provider });
  } catch (error) {
    console.error("Update Provider Profile Error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// 🔄 Update Provider Status (online / offline / in-progress)
export const updateProviderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["online", "offline", "in-progress"].includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      { status },
      { new: true }
    ).select("-password");

    res.json({ message: "Status updated", provider });
  } catch (error) {
    console.error("Update Provider Status Error:", error);
    res.status(500).json({ message: "Server error updating status" });
  }
};

// 📊 Provider Dashboard Stats
export const getProviderDashboardStats = async (req, res) => {
  try {
    const providerId = new mongoose.Types.ObjectId(req.user.id);

    const [totalBookings, completedBookings, pendingBookings, earningsAgg, recentRequests] =
      await Promise.all([
        Booking.countDocuments({ provider: providerId }),
        Booking.countDocuments({ provider: providerId, status: "Completed" }),
        Booking.countDocuments({ provider: providerId, status: "Pending" }),

        // FIX: Use paidAt for earnings grouping instead of service date
        Booking.aggregate([
          { $match: { provider: providerId, paymentStatus: "Paid" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),

        // 5 most recent pending requests with seeker details
        Booking.find({ provider: providerId, status: "Pending" })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("seeker", "userName contactNumber"),
      ]);

    const totalEarnings = earningsAgg.length ? earningsAgg[0].total : 0;

    res.json({
      totalBookings,
      completedBookings,
      pendingBookings,
      totalEarnings,
      recentRequests,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
};

// 💰 Earnings History (grouped by month)
// FIX: Group by paidAt month instead of service date
export const getProviderEarnings = async (req, res) => {
  try {
    const providerId = new mongoose.Types.ObjectId(req.user.id);

    const earnings = await Booking.aggregate([
      {
        $match: {
          provider: providerId,
          paymentStatus: "Paid",
          paidAt: { $ne: null }, // Only bookings with a recorded payment date
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$paidAt" },
            year: { $year: "$paidAt" },
          },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    res.json({ earnings });
  } catch (error) {
    console.error("Earnings Error:", error);
    res.status(500).json({ message: "Error fetching earnings" });
  }
};

// 🌍 Get All Providers (public — for seeker browse)
export const getAllProviders = async (req, res) => {
  try {
    const { page = 1, limit = 20, skill } = req.query;
    const filter = {};
    if (skill) filter.skills = { $in: [new RegExp(skill, "i")] };

    const providers = await Provider.find(filter)
      .select("-password -reviews")
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Provider.countDocuments(filter);

    res.json({ providers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Get All Providers Error:", error);
    res.status(500).json({ message: "Server error fetching providers" });
  }
};

// 🔎 Get Provider by ID (public)
export const getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).select("-password");
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (error) {
    console.error("Get Provider By ID Error:", error);
    res.status(500).json({ message: "Server error fetching provider" });
  }
};