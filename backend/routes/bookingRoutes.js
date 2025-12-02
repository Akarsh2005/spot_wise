// routes/bookingRoutes.js
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
import authMiddleware from "../middleware/auth_middleware.js";

const router = express.Router();

// Seeker
router.post("/", authMiddleware, createBooking);
router.get("/seeker", authMiddleware, getSeekerBookings);
router.put("/seeker/cancel/:bookingId", authMiddleware, cancelBooking);
router.put("/review/:bookingId", authMiddleware, submitReview);

// Provider
router.get("/provider", authMiddleware, getProviderBookings);
router.put("/provider/:bookingId", authMiddleware, updateBookingStatus);

// Shared
router.get("/:bookingId", authMiddleware, getBookingDetails);

export default router;
