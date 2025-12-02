import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'sender.modelRef',
      },
      modelRef: {
        type: String,
        required: true,
        enum: ['Seeker', 'Provider'],
      },
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'readBy.modelRef',
        },
        modelRef: {
          type: String,
          required: true,
          enum: ['Seeker', 'Provider'],
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;