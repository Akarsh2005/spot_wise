import express from "express";
import {
  createBooking,
  getSeekerBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingDetails,
  submitReview,
} from "../controllers/bookingController.js";
import authMiddleware, { requireRole } from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Seeker-only Routes ─────────────────────────────────────────
router.post("/",                       authMiddleware, requireRole("seeker"), createBooking);
router.get("/seeker",                  authMiddleware, requireRole("seeker"), getSeekerBookings);
router.put("/seeker/cancel/:bookingId",authMiddleware, requireRole("seeker"), cancelBooking);
router.put("/seeker/pay/:bookingId",   authMiddleware, requireRole("seeker"), updateBookingStatus);
router.put("/review/:bookingId",       authMiddleware, requireRole("seeker"), submitReview);

// ─── Provider-only Routes ───────────────────────────────────────
router.get("/provider",                authMiddleware, requireRole("provider"), getProviderBookings);
router.put("/provider/:bookingId",     authMiddleware, requireRole("provider"), updateBookingStatus);

// ─── Shared (seeker or provider who owns the booking) ──────────
router.get("/:bookingId", authMiddleware, getBookingDetails);

export default router;