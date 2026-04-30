import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderRole: { type: String, enum: ["Seeker", "Provider"], required: true },
  text: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);