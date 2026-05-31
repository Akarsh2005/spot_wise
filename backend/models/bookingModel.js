import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  seeker: { type: mongoose.Schema.Types.ObjectId, ref: "Seeker", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "Provider", required: true },
  serviceType: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  issueDescription: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Payment Pending", "Completed", "Rejected"],
    default: "Pending"
  },
  hoursWorked: { type: Number, default: 0 },
  extraCosts: { type: Number, default: 0 },
  extrasList: [{
    name: { type: String },
    price: { type: Number }
  }],
  totalCost: { type: Number, default: 0 }, // Final calculated cost
  isPaid: { type: Boolean, default: false },
  rating: { type: Number },
  review: { type: String }
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);