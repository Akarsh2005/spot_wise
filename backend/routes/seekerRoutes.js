import express from "express";
import {
  registerSeeker,
  loginSeeker,
  getSeekerProfile,
  updateSeekerProfile
} from "../controllers/seekerController.js";
import authMiddleware, { requireRole } from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Public Routes ─────────────────────────────────────────────
router.post("/register", registerSeeker);
router.post("/login", loginSeeker);

// ─── Protected Routes (seeker only) ────────────────────────────
router.get("/profile",  authMiddleware, requireRole("seeker"), getSeekerProfile);
router.put("/profile",  authMiddleware, requireRole("seeker"), updateSeekerProfile);

export default router;