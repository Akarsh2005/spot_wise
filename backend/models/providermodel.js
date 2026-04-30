import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "provider" },
  contactNumber: { type: String, required: true },
  skills: [{ type: String, required: true }],
  
  // For Maps: simple GeoJSON
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  
  status: { type: String, enum: ["offline", "online"], default: "online" },

  // 💰 Pricing Structure
  pricing: {
    serviceCharge: { type: Number, default: 0 }, // Base fee for visiting / small issues
    hourlyRate: { type: Number, default: 0 }     // Added if it's a big issue requiring hours
  },

  // ⭐ Rating Facility
  rating: { type: Number, default: 0 },
  reviews: [{
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "Seeker" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String }
  }]
}, { timestamps: true });

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

// ⭐ Recalculate overall rating
providerSchema.methods.updateRating = async function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    this.rating = parseFloat((total / this.reviews.length).toFixed(2));
  }
  await this.save();
};

export default mongoose.model("Provider", providerSchema);