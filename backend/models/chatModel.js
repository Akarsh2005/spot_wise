// backend/models/chatModel.js
import mongoose from 'mongoose';

// 👥 Define participant schema (embedded)
const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'participants.modelRef', // dynamically reference Seeker or Provider
    },
    modelRef: {
      type: String,
      required: true,
      enum: ['Seeker', 'Provider'], // Must match exact model names
    },
  },
  { _id: false }
);

// 💬 Define chat schema
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
      ref: 'Message',
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.modelRef', // dynamically reference based on model
    },
  },
  { timestamps: true }
);

// ✅ Index for efficient querying
chatSchema.index({ 'participants.user': 1 });

// ✅ Create and export Chat model
const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
