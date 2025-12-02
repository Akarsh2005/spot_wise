// routes/chatRoutes.js
import express from "express";
import authMiddleware from "../middleware/auth_middleware.js";
import { accessChat, fetchChats } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", authMiddleware, accessChat); // create/access chat (only if accepted booking exists)
router.get("/", authMiddleware, fetchChats);

export default router;
