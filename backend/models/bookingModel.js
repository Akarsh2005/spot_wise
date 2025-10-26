const mongoose = require('mongoose');

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
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    instructions: {
      type: String
    },
    reason: {
      type: String
    },
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
    totalAmount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String
    }
  },
  { timestamps: true }
);

bookingSchema.index({ provider: 1, seeker: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;