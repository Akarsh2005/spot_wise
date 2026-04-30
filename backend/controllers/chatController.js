import Chat from "../models/chatModel.js";
import Booking from "../models/bookingModel.js";

export const accessChat = async (req, res) => {
  const { userId, bookingId } = req.body;

  try {
    let chat;
    if (bookingId) {
       chat = await Chat.findOne({ booking: bookingId })
         .populate("seeker", "userName email")
         .populate("provider", "name email");
    } else if (userId) {
       chat = await Chat.findOne({
         $or: [
           { seeker: req.user.id, provider: userId },
           { seeker: userId, provider: req.user.id }
         ]
       })
         .populate("seeker", "userName email")
         .populate("provider", "name email");
    } else {
       return res.status(400).json({ message: "userId or bookingId is required" });
    }

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (chat.seeker._id.toString() !== req.user.id && chat.provider._id.toString() !== req.user.id) {
       return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: "Server error while accessing chat" });
  }
};

export const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [{ seeker: req.user.id }, { provider: req.user.id }]
    })
      .populate("seeker", "userName email")
      .populate("provider", "name email")
      .populate("booking", "serviceType status")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching chats" });
  }
};