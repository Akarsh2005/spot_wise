// backend/models/providerModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const providerSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      default: 'provider'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Enter a valid email'
      ]
    },
    contactNumber: {
      type: String,
      match: [/^[0-9]{10}$/, 'Enter a valid 10-digit number']
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    skills: {
      type: [String],
      required: true
    },
    rate: {
      type: Number,
      default: 0,
      min: 0
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String }
    },
    // 🔥 NEW: Location coordinates for geospatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    status: {
      type: String,
      enum: ['offline', 'online', 'active', 'in-progress'],
      default: 'offline'
    },
    verified: {
      type: Boolean,
      default: false
    },
    reviews: [
      {
        booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
        seeker: { type: mongoose.Schema.Types.ObjectId, ref: 'Seeker' },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    rating: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// 🔥 Create geospatial index for location-based queries
providerSchema.index({ location: '2dsphere' });

// 🔐 Hash password before saving
providerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
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
    this.rating = total / this.reviews.length;
  }
  await this.save();
};

// ✅ Export model
const Provider = mongoose.model('Provider', providerSchema);
export default Provider;