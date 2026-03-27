// routes/chatRoutes.js
import express from "express";
import authMiddleware from "../middleware/auth_middleware.js";
import { accessChat, fetchChats } from "../controllers/chatController.js";

const router = express.Router();

// Both seekers and providers can access their chats
// Individual access is gated by booking existence check inside the controller
router.post("/", authMiddleware, accessChat);
router.get("/",  authMiddleware, fetchChats);

export default router;