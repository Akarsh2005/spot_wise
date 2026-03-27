// models/bookingModel.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seeker",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    instructions: { type: String, trim: true },
    reason: { type: String, trim: true },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "In Progress", "Completed", "Cancelled", "Rejected"],
      default: "Pending",
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Refunded"],
      default: "Unpaid",
    },

    // 💰 FIX: Track when payment was actually made (was missing before)
    // This fixes earnings grouping by actual payment month, not service date
    paidAt: {
      type: Date,
      default: null,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: { type: String, trim: true },
  },
  { timestamps: true }
);

// ⚙️ Indexes for optimized queries
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ seeker: 1, status: 1 });
bookingSchema.index({ provider: 1, paymentStatus: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;