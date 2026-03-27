// routes/providerRoutes.js
import express from "express";
import {
  registerProvider,
  loginProvider,
  getProviderProfile,
  updateProviderProfile,
  updateProviderStatus,
  updateProviderLocation,
  getProviderDashboardStats,
  getProviderEarnings,
  getAllProviders,
  getProviderById,
  getProvidersNearby,
} from "../controllers/providerController.js";
import authMiddleware, { requireRole } from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────
router.post("/register", registerProvider);
router.post("/login",    loginProvider);
router.get("/nearby",    getProvidersNearby); // Seeker-facing map endpoint

// ─── IMPORTANT: Specific named routes MUST come before /:id ─────
// FIX: Route ordering bug — previously /:id matched before these named routes

// ─── Protected Routes (provider only) ──────────────────────────
router.get("/profile",   authMiddleware, requireRole("provider"), getProviderProfile);
router.put("/profile",   authMiddleware, requireRole("provider"), updateProviderProfile);
router.put("/status",    authMiddleware, requireRole("provider"), updateProviderStatus);
router.put("/location",  authMiddleware, requireRole("provider"), updateProviderLocation);
router.get("/dashboard", authMiddleware, requireRole("provider"), getProviderDashboardStats);
router.get("/earnings",  authMiddleware, requireRole("provider"), getProviderEarnings);

// ─── Public browsing ───────────────────────────────────────────
router.get("/", getAllProviders);

// FIX: /:id wildcard is LAST — must come after all named routes
router.get("/:id", getProviderById);

export default router;