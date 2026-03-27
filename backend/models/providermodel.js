// models/providerModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const providerSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: "provider",
    },
    name: {
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
      match: [/^[0-9]{10}$/, "Enter a valid 10-digit number"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    skills: {
      type: [String],
      required: true,
    },
    rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },

    // 📍 GeoJSON location for $near queries
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

    // 📍 FIX: Flag to know if provider set a real location (was missing before)
    locationSet: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["offline", "online", "in-progress"],
      default: "offline",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    reviews: [
      {
        booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
        seeker: { type: mongoose.Schema.Types.ObjectId, ref: "Seeker" },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rating: {
      type: Number,
      default: 0,
    },

    // 💰 Track total paid earnings as a cached field
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 📍 2dsphere index for geospatial queries
providerSchema.index({ location: "2dsphere" });

// 🔐 Hash password before saving
providerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Compare password
providerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ⭐ FIX: Recalculate overall rating from all reviews
providerSchema.methods.updateRating = async function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    this.rating = parseFloat((total / this.reviews.length).toFixed(2));
  }
  await this.save();
};

const Provider = mongoose.model("Provider", providerSchema);
export default Provider;