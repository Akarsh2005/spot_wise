// backend/controllers/chatController.js
import Chat from "../models/chatModel.js";
import Booking from "../models/bookingModel.js";

export const accessChat = async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Check if booking exists between users
    const booking = await Booking.findOne({
      $or: [
        { seeker: req.user.id, provider: userId, status: { $in: ["Accepted", "In Progress", "Completed"] } },
        { seeker: userId, provider: req.user.id, status: { $in: ["Accepted", "In Progress", "Completed"] } }
      ]
    });

    if (!booking) {
      return res.status(403).json({ 
        message: "No accepted booking exists between these users" 
      });
    }

    // Find or create chat
    let chat = await Chat.findOne({
      $and: [
        { "participants.user": req.user.id },
        { "participants.user": userId }
      ]
    })
    .populate("participants.user", "name userName email")
    .populate("latestMessage");

    if (!chat) {
      // Determine roles
      const currentUserRole = req.user.role === 'seeker' ? 'Seeker' : 'Provider';
      const otherUserRole = req.user.role === 'seeker' ? 'Provider' : 'Seeker';

      chat = await Chat.create({
        participants: [
          { 
            user: req.user.id, 
            modelRef: currentUserRole 
          },
          { 
            user: userId, 
            modelRef: otherUserRole 
          }
        ]
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

export const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({ 
      "participants.user": req.user.id 
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