import express from "express";
import {
  registerSeeker,
  loginSeeker,
  getSeekerProfile,
  updateSeekerProfile,
  updateSeekerLocation,
  addSavedProvider,
  removeSavedProvider
} from "../controllers/seekerController.js";
import authMiddleware, { requireRole } from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Public Routes ─────────────────────────────────────────────
router.post("/register", registerSeeker);
router.post("/login", loginSeeker);

// ─── Protected Routes (seeker only) ────────────────────────────
router.get("/profile",  authMiddleware, requireRole("seeker"), getSeekerProfile);
router.put("/profile",  authMiddleware, requireRole("seeker"), updateSeekerProfile);
router.put("/location", authMiddleware, requireRole("seeker"), updateSeekerLocation);
router.post("/saved/:providerId", authMiddleware, requireRole("seeker"), addSavedProvider);
router.delete("/saved/:providerId", authMiddleware, requireRole("seeker"), removeSavedProvider);

export default router;