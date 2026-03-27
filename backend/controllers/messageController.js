// controllers/messageController.js
import Message from "../models/messageModel.js";
import Chat from "../models/chatModel.js";

// ✅ Send a Message
export const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: "Content and chat ID are required" });
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify the sender is a participant in this chat
    const isParticipant = chat.participants.some(
      (p) => p.user.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant in this chat" });
    }

    const senderModelRef = req.user.role === "seeker" ? "Seeker" : "Provider";

    const newMessage = await Message.create({
      sender: { user: req.user.id, modelRef: senderModelRef },
      content,
      chat: chatId,
      readBy: [{ user: req.user.id, modelRef: senderModelRef }],
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender.user", "name userName email")
      .populate("chat");

    // Update latestMessage on the chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: populatedMessage._id });

    // 📡 Broadcast to all users in the chat room
    const io = req.app.get("io");
    io.to(chatId.toString()).emit("message_received", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Server error while sending message" });
  }
};

// ✅ Get All Messages in a Chat
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify the requester is a participant
    const isParticipant = chat.participants.some(
      (p) => p.user.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant in this chat" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender.user", "name userName email")
      .populate("readBy.user", "name userName email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Server error while fetching messages" });
  }
};