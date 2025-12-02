// backend/server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import jwt from "jsonwebtoken";

// Import Routes
import providerRoutes from "./routes/providerRoutes.js";
import seekerRoutes from "./routes/seekerRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

// Load environment variables
dotenv.config();
await connectDB();

// Initialize Express
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Seeker Frontend
      "http://localhost:5174", // Provider Frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Base route
app.get("/", (req, res) => res.send("🚀 SpotWise API is live!"));

// Use routes
app.use("/api/providers", providerRoutes);
app.use("/api/seekers", seekerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

// Create HTTP + Socket.io Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
});

// Online users map
const onlineUsers = new Map();

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.io event handling
io.on("connection", (socket) => {
  console.log(`🟢 User ${socket.user.id} connected`);
  onlineUsers.set(socket.user.id, socket.id);

  // Join personal room
  socket.join(socket.user.id);

  // Join chat room
  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user.id} joined chat ${chatId}`);
  });

  // Leave chat room
  socket.on("leave_chat", (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.user.id} left chat ${chatId}`);
  });

  // Typing events
  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.chatId).emit("stop_typing", data);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 User ${socket.user.id} disconnected`);
    onlineUsers.delete(socket.user.id);
  });
});

// Make io and onlineUsers available to controllers
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
