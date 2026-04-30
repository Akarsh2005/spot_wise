// controllers/seekerController.js
import jwt from "jsonwebtoken";
import Seeker from "../models/seekermodel.js";

// 🔑 Generate JWT token
const generateToken = (seeker) => {
  return jwt.sign(
    { id: seeker._id, role: "seeker" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ✅ Register Seeker
export const registerSeeker = async (req, res) => {
  try {
    const { userName, email, contactNumber, password } = req.body;

    const existingSeeker = await Seeker.findOne({ email });
    if (existingSeeker) {
      return res.status(400).json({ message: "User already exists" });
    }

    const seeker = new Seeker({ userName, email, contactNumber, password });
    await seeker.save();

    const token = generateToken(seeker);
    res.status(201).json({
      message: "Seeker registered successfully",
      token,
      seeker: { ...seeker.toObject(), password: undefined },
    });
  } catch (error) {
    console.error("Register Seeker Error:", error);
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// ✅ Login Seeker
export const loginSeeker = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const seeker = await Seeker.findOne({ email });
    if (!seeker) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await seeker.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(seeker);
    res.json({
      message: "Login successful",
      token,
      seeker: { ...seeker.toObject(), password: undefined },
    });
  } catch (error) {
    console.error("Login Seeker Error:", error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};

// ✅ Get Seeker Profile
export const getSeekerProfile = async (req, res) => {
  try {
    const seeker = await Seeker.findById(req.user.id).select("-password");
    if (!seeker) return res.status(404).json({ message: "Seeker not found" });
    res.json(seeker);
  } catch (error) {
    console.error("Get Seeker Profile Error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// ✅ Update Seeker Profile
// FIX: Whitelist only safe fields — prevents mass assignment (e.g. role, locationSet)
export const updateSeekerProfile = async (req, res) => {
  try {
    const { userName, contactNumber } = req.body;
    const seeker = await Seeker.findByIdAndUpdate(
      req.user.id,
      { userName, contactNumber },
      { new: true, runValidators: true }
    ).select("-password");

    if (!seeker) return res.status(404).json({ message: "Seeker not found" });
    res.json({ message: "Profile updated successfully", seeker });
  } catch (error) {
    console.error("Update Seeker Profile Error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// 📍 Update Seeker Location (NEW)
export const updateSeekerLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined)
      return res.status(400).json({ message: "Latitude and longitude are required" });

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
      return res.status(400).json({ message: "Invalid coordinates" });

    const seeker = await Seeker.findByIdAndUpdate(
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

    res.json({ message: "Location updated successfully", seeker });
  } catch (error) {
    console.error("Update Seeker Location Error:", error);
    res.status(500).json({ message: "Server error updating location" });
  }
};

// ✅ Add Provider to Saved List
export const addSavedProvider = async (req, res) => {
  try {
    const seeker = await Seeker.findById(req.user.id);
    if (!seeker) return res.status(404).json({ message: "Seeker not found" });

    const providerId = req.params.providerId;
    if (!seeker.savedProviders.includes(providerId)) {
      seeker.savedProviders.push(providerId);
      await seeker.save();
    }

    res.json({ message: "Provider saved", savedProviders: seeker.savedProviders });
  } catch (error) {
    console.error("Add Saved Provider Error:", error);
    res.status(500).json({ message: "Error saving provider" });
  }
};

// ✅ Remove Provider from Saved List
export const removeSavedProvider = async (req, res) => {
  try {
    const seeker = await Seeker.findById(req.user.id);
    if (!seeker) return res.status(404).json({ message: "Seeker not found" });

    const providerId = req.params.providerId;
    seeker.savedProviders = seeker.savedProviders.filter(
      (id) => id.toString() !== providerId
    );
    await seeker.save();

    res.json({ message: "Provider removed from saved list", savedProviders: seeker.savedProviders });
  } catch (error) {
    console.error("Remove Saved Provider Error:", error);
    res.status(500).json({ message: "Error removing provider" });
  }
};