// controllers/chatController.js
import Chat from "../models/chatModel.js";
import Booking from "../models/bookingModel.js";

// ✅ Access or create a chat between seeker and provider
// FIX: Only allow chat if an ACTIVE booking exists (Accepted or In Progress)
// FIX: Old completed bookings no longer grant indefinite chat access
export const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Check for an active booking between these two users
    const activeBooking = await Booking.findOne({
      $or: [
        { seeker: req.user.id, provider: userId },
        { seeker: userId, provider: req.user.id },
      ],
      status: { $in: ["Accepted", "In Progress"] },
    }).sort({ createdAt: -1 }); // Most recent active booking

    if (!activeBooking) {
      return res.status(403).json({
        message: "No active booking exists between these users",
      });
    }

    // Find or create the chat
    let chat = await Chat.findOne({
      $and: [
        { "participants.user": req.user.id },
        { "participants.user": userId },
      ],
    })
      .populate("participants.user", "name userName email")
      .populate("latestMessage");

    if (!chat) {
      const currentUserModelRef = req.user.role === "seeker" ? "Seeker" : "Provider";
      const otherUserModelRef = req.user.role === "seeker" ? "Provider" : "Seeker";

      chat = await Chat.create({
        participants: [
          { user: req.user.id, modelRef: currentUserModelRef },
          { user: userId, modelRef: otherUserModelRef },
        ],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants.user", "name userName email")
        .populate("latestMessage");
    }

    res.json(chat);
  } catch (error) {
    console.error("Access Chat Error:", error);
    res.status(500).json({ message: "Server error while accessing chat" });
  }
};

// ✅ Fetch all chats for the logged-in user
export const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      "participants.user": req.user.id,
    })
      .populate("participants.user", "name userName email")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    console.error("Fetch Chats Error:", error);
    res.status(500).json({ message: "Server error while fetching chats" });
  }
};