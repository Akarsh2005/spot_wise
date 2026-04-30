import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  seeker: { type: mongoose.Schema.Types.ObjectId, ref: "Seeker", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "Provider", required: true },
  serviceType: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["Pending", "Accepted", "Completed", "Rejected"], 
    default: "Pending" 
  },
  totalCost: { type: Number, default: 0 } // Final calculated cost based on service + hourly
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);