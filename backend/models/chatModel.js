// models/chatModel.js
import mongoose from "mongoose";

// 👥 Participant schema — supports both Seeker and Provider via refPath
const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "participants.modelRef",
    },
    modelRef: {
      type: String,
      required: true,
      enum: ["Seeker", "Provider"],
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    participants: {
      type: [participantSchema],
      required: true,
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "participants.modelRef",
    },
  },
  { timestamps: true }
);

chatSchema.index({ "participants.user": 1 });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;