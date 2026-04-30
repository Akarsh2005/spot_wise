import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  seeker: { type: mongoose.Schema.Types.ObjectId, ref: "Seeker", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "Provider", required: true }
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);