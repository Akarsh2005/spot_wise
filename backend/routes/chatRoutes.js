import express from "express";
import authMiddleware from "../middleware/auth_middleware.js";
import { accessChat, fetchChats } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", authMiddleware, accessChat);
router.get("/",  authMiddleware, fetchChats);

export default router;