import Message from "../models/messageModel.js";
import Chat from "../models/chatModel.js";

export const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: "Content and chat ID are required" });
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (chat.seeker.toString() !== req.user.id && chat.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not a participant in this chat" });
    }

    const newMessage = await Message.create({
      chat: chatId,
      senderId: req.user.id,
      senderRole: req.user.role === "seeker" ? "Seeker" : "Provider",
      text: content
    });

    const io = req.app.get("io");
    io.to(chatId.toString()).emit("message_received", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Server error while sending message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (chat.seeker.toString() !== req.user.id && chat.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not a participant in this chat" });
    }

    const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching messages" });
  }
};