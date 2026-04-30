import express from "express";
import {
  registerProvider,
  loginProvider,
  getProviderProfile,
  updateProviderProfile,
  updateProviderStatus,
  updateProviderLocation,
  getProviderById,
  getProvidersNearby,
} from "../controllers/providerController.js";
import authMiddleware, { requireRole } from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────
router.post("/register", registerProvider);
router.post("/login",    loginProvider);
router.get("/nearby",    getProvidersNearby); // Seeker-facing map endpoint

// ─── Protected Routes (provider only) ──────────────────────────
router.get("/profile",   authMiddleware, requireRole("provider"), getProviderProfile);
router.put("/profile",   authMiddleware, requireRole("provider"), updateProviderProfile);
router.put("/status",    authMiddleware, requireRole("provider"), updateProviderStatus);
router.put("/location",  authMiddleware, requireRole("provider"), updateProviderLocation);

// ─── Public browsing ───────────────────────────────────────────
router.get("/:id", getProviderById);

export default router;