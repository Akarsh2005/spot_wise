const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/auth_middleware");

// ------------------- Protected Routes -------------------

// Seeker routes
router.post("/", authMiddleware, bookingController.createBooking);
router.get("/seeker", authMiddleware, bookingController.getSeekerBookings);
router.get("/seeker/filter", authMiddleware, bookingController.filterSeekerBookings);
router.put("/seeker/cancel/:bookingId", authMiddleware, bookingController.cancelBooking);

// Provider routes
router.get("/provider", authMiddleware, bookingController.getProviderBookings);
router.get("/provider/filter", authMiddleware, bookingController.filterProviderBookings);
router.put("/provider/:bookingId", authMiddleware, bookingController.updateBookingStatus);
router.get('/dashboard-bookings', authMiddleware, bookingController.getProviderDashboardBookings);


// Single booking details (both seeker & provider)
router.get("/:bookingId", authMiddleware, bookingController.getBookingDetails);

// Submit review (Seeker)
router.put("/review/:bookingId", authMiddleware, bookingController.submitReview);

// Get provider reviews
router.get("/provider/:providerId/reviews", bookingController.getProviderReviews);


module.exports = router;
