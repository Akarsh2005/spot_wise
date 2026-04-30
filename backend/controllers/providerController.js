import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Provider from "../models/providermodel.js";
import Booking from "../models/bookingModel.js";

const generateToken = (provider) => {
  return jwt.sign(
    { id: provider._id, role: "provider" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const registerProvider = async (req, res) => {
  try {
    const { name, email, contactNumber, password, skills, serviceCharge, hourlyRate } = req.body;

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
      pricing: {
        serviceCharge: serviceCharge || 0,
        hourlyRate: hourlyRate || 0
      },
      location: { type: "Point", coordinates: [0, 0] }
    });

    await provider.save();

    const token = generateToken(provider);
    res.status(201).json({
      message: "Provider registered successfully.",
      token,
      provider: { ...provider.toObject(), password: undefined },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

export const loginProvider = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

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
    res.status(500).json({ message: "Server error during login" });
  }
};

export const updateProviderLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined)
      return res.status(400).json({ message: "Latitude and longitude are required" });

    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        }
      },
      { new: true }
    ).select("-password");

    res.json({ message: "Location updated successfully", provider });
  } catch (error) {
    res.status(500).json({ message: "Server error updating location" });
  }
};

export const getProvidersNearby = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000, skill } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const dist = parseInt(maxDistance);

    if (isNaN(lat) || isNaN(lng) || isNaN(dist))
      return res.status(400).json({ message: "Invalid coordinates" });

    const filter = {
      "location.coordinates": { $ne: [0, 0] },
      status: "online",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: dist,
        },
      },
    };

    if (skill) filter.skills = { $in: [new RegExp(skill, "i")] };

    const providers = await Provider.find(filter).select("-password");

    res.json({
      count: providers.length,
      providers,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching nearby providers" });
  }
};

export const getProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findById(req.user.id).select("-password");
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

export const updateProviderProfile = async (req, res) => {
  try {
    const { name, contactNumber, skills, serviceCharge, hourlyRate } = req.body;

    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      {
        name,
        contactNumber,
        skills,
        pricing: { serviceCharge: serviceCharge || 0, hourlyRate: hourlyRate || 0 }
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ message: "Profile updated successfully", provider });
  } catch (error) {
    res.status(500).json({ message: "Server error updating profile" });
  }
};

export const updateProviderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["online", "offline"].includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      { status },
      { new: true }
    ).select("-password");

    res.json({ message: "Status updated", provider });
  } catch (error) {
    res.status(500).json({ message: "Server error updating status" });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).select("-password");
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching provider" });
  }
};