// routes/messageRoutes.js
import express from "express";
import authMiddleware from "../middleware/auth_middleware.js";
import { sendMessage, getMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/",         authMiddleware, sendMessage);
router.get("/:chatId",  authMiddleware, getMessages);

export default router;