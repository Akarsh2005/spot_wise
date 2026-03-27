// models/seekerModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const seekerSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: "seeker",
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Enter a valid email",
      ],
    },
    contactNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Enter a valid 10-digit contact number"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },

    // 📍 FIX: Added GeoJSON location for geo-queries (was missing before)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    locationSet: {
      type: Boolean,
      default: false, // Tracks if seeker has updated their real location
    },

    savedProviders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Provider" }],
  },
  { timestamps: true }
);

// 📍 2dsphere index for geospatial queries
seekerSchema.index({ location: "2dsphere" });

// 🔐 Hash password before saving
seekerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Compare password
seekerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Seeker = mongoose.model("Seeker", seekerSchema);
export default Seeker;