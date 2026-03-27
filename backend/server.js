// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";               // FIX: HTTP security headers
import rateLimit from "express-rate-limit"; // FIX: Brute-force protection
import connectDB from "./config/db.js";
import jwt from "jsonwebtoken";
import Chat from "./models/chatModel.js";

// ─── Import Routes ──────────────────────────────────────────────
import providerRoutes from "./routes/providerRoutes.js";
import seekerRoutes   from "./routes/seekerRoutes.js";
import bookingRoutes  from "./routes/bookingRoutes.js";
import chatRoutes     from "./routes/chatRoutes.js";
import messageRoutes  from "./routes/messageRoutes.js";

dotenv.config();
await connectDB();

const app = express();

// ─── Security Middleware ────────────────────────────────────────
// FIX: helmet adds X-XSS-Protection, CSP, HSTS, clickjacking headers etc.
app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Seeker frontend
      "http://localhost:5174", // Provider frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" })); // Limit payload size

// ─── Rate Limiting ──────────────────────────────────────────────
// FIX: Limit auth routes to 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit — 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/providers/login",    authLimiter);
app.use("/api/providers/register", authLimiter);
app.use("/api/seekers/login",      authLimiter);
app.use("/api/seekers/register",   authLimiter);

// ─── Base Route ─────────────────────────────────────────────────
app.get("/", (req, res) => res.send("🚀 SpotWise API is live!"));

// ─── API Routes ─────────────────────────────────────────────────
app.use("/api/providers", providerRoutes);
app.use("/api/seekers",   seekerRoutes);
app.use("/api/bookings",  bookingRoutes);
app.use("/api/chats",     chatRoutes);
app.use("/api/messages",  messageRoutes);

// ─── Global Error Handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ─── HTTP + Socket.IO Server ────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
});

// Online users: userId → socketId
const onlineUsers = new Map();

// ─── Socket Authentication Middleware ───────────────────────────
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

// ─── Socket Events ───────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🟢 User ${socket.user.id} connected [${socket.user.role}]`);

  // Register user in online map (overwrites stale entry on reconnect)
  onlineUsers.set(socket.user.id, socket.id);

  // Join personal room for direct notifications
  socket.join(socket.user.id);

  // ── Chat room join/leave ──────────────────────────────────────
  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user.id} joined chat ${chatId}`);
  });

  socket.on("leave_chat", (chatId) => {
    socket.leave(chatId);
  });

  // ── Typing indicators ─────────────────────────────────────────
  // FIX: Validate chat membership before broadcasting typing events
  socket.on("typing", async (data) => {
    try {
      const chat = await Chat.findById(data.chatId).select("participants");
      const isMember = chat?.participants.some(
        (p) => p.user.toString() === socket.user.id
      );
      if (isMember) socket.to(data.chatId).emit("typing", data);
    } catch (_) {}
  });

  socket.on("stop_typing", async (data) => {
    try {
      const chat = await Chat.findById(data.chatId).select("participants");
      const isMember = chat?.participants.some(
        (p) => p.user.toString() === socket.user.id
      );
      if (isMember) socket.to(data.chatId).emit("stop_typing", data);
    } catch (_) {}
  });

  // ── Disconnect ────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`🔴 User ${socket.user.id} disconnected`);
    onlineUsers.delete(socket.user.id);
  });
});

// ─── Stale Socket Cleanup ────────────────────────────────────────
// FIX: Sweep onlineUsers map every 5 minutes for entries with dead socket IDs
// This handles crash-disconnects where the disconnect event was missed
setInterval(() => {
  for (const [userId, socketId] of onlineUsers) {
    if (!io.sockets.sockets.has(socketId)) {
      onlineUsers.delete(userId);
      console.log(`🧹 Removed stale socket entry for user ${userId}`);
    }
  }
}, 5 * 60 * 1000);

// ─── Share io and onlineUsers with controllers ───────────────────
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// ─── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () =>
  console.log(`✅ SpotWise server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`)
);