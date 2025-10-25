import express from "express";
import {
  createBooking,
  getSeekerBookings,
  getProviderBookings,
  updateBookingStatus,
  getBookingDetails,
} from "../controllers/bookingController.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = express.Router();

// Seeker routes
router.post("/", authMiddleware, createBooking); // create booking
router.get("/seeker", authMiddleware, getSeekerBookings); // all bookings of seeker

// Provider routes
router.get("/provider", authMiddleware, getProviderBookings); // all bookings for provider
router.put("/:bookingId/status", authMiddleware, updateBookingStatus); // update booking status

// Shared route
router.get("/:bookingId", authMiddleware, getBookingDetails); // get booking details

export default router;
