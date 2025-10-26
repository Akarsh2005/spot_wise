const Booking = require("../models/bookingModel");
const Provider = require("../models/providermodel");
const Seeker = require("../models/seekermodel");

// Create Booking
exports.createBooking = async (req, res) => {
  try {
    const { providerId, serviceType, date, time, address, instructions, totalAmount } = req.body;

    if (!providerId || !serviceType || !date || !time || !address) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    const booking = new Booking({
      seeker: req.user.id,
      provider: providerId,
      serviceType,
      date,
      time,
      address,
      instructions,
      totalAmount,
    });

    await booking.save();
    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json({ message: "Server error while creating booking" });
  }
};

// Get bookings of seeker
exports.getSeekerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ seeker: req.user.id })
      .populate("provider", "name skills rate contactNumber")
      .sort({ date: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Get Seeker Bookings Error:", error);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

// Get all bookings for provider
exports.getProviderBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ provider: req.user.id })
            .populate("seeker", "userName email contactNumber")
            .sort({ date: -1 });
        res.json(bookings);
    } catch (error) {
        console.error("Get Provider Bookings Error:", error);
        res.status(500).json({ message: "Server error while fetching bookings" });
    }
};

// Get all bookings for logged-in provider (for dashboard)
exports.getProviderDashboardBookings = async (req, res) => {
    try {
        const providerId = req.user.id;

        const bookings = await Booking.find({ provider: providerId })
            .populate("seeker", "userName email contactNumber")
            .sort({ date: 1 }); // upcoming first

        res.json(bookings);
    } catch (error) {
        console.error("Get Provider Dashboard Bookings Error:", error);
        res.status(500).json({ message: "Server error while fetching provider bookings" });
    }
};

// Update booking status or payment status (Provider only)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, paymentStatus, reason } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Only provider can update
        if (booking.provider.toString() !== req.user.id)
            return res.status(403).json({ message: "Unauthorized" });

        if (status) booking.status = status;
        if (paymentStatus) booking.paymentStatus = paymentStatus;
        if (reason) booking.reason = reason;

        await booking.save();
        res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        res.status(500).json({ message: "Server error while updating booking" });
    }
};

// Get single booking details (Seeker or Provider)
exports.getBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate("provider", "name skills rate contactNumber")
            .populate("seeker", "userName email contactNumber");

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Only involved seeker or provider can view
        if (
            booking.seeker._id.toString() !== req.user.id &&
            booking.provider._id.toString() !== req.user.id
        ) return res.status(403).json({ message: "Unauthorized" });

        res.json(booking);
    } catch (error) {
        console.error("Get Booking Details Error:", error);
        res.status(500).json({ message: "Server error while fetching booking details" });
    }
};

// Filter seeker bookings
exports.filterSeekerBookings = async (req, res) => {
    try {
        const { status, fromDate, toDate } = req.query;
        let filter = { seeker: req.user.id };

        if (status) filter.status = status;
        if (fromDate || toDate) filter.date = {};
        if (fromDate) filter.date.$gte = new Date(fromDate);
        if (toDate) filter.date.$lte = new Date(toDate);

        const bookings = await Booking.find(filter)
            .populate("provider", "name skills rate contactNumber")
            .sort({ date: -1 });

        res.json(bookings);
    } catch (error) {
        console.error("Filter Seeker Bookings Error:", error);
        res.status(500).json({ message: "Server error while filtering bookings" });
    }
};

// Cancel booking (Seeker)
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId);

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.seeker.toString() !== req.user.id)
            return res.status(403).json({ message: "Unauthorized" });

        if (booking.status === "Completed")
            return res.status(400).json({ message: "Cannot cancel completed booking" });

        booking.status = "Cancelled";
        await booking.save();

        res.json({ message: "Booking cancelled successfully", booking });
    } catch (error) {
        console.error("Cancel Booking Error:", error);
        res.status(500).json({ message: "Server error while cancelling booking" });
    }
};

// Filter provider bookings
exports.filterProviderBookings = async (req, res) => {
    try {
        const { status, upcoming } = req.query;
        let filter = { provider: req.user.id };

        if (status) filter.status = status;
        if (upcoming === "true") filter.date = { $gte: new Date() };

        const bookings = await Booking.find(filter)
            .populate("seeker", "userName email contactNumber")
            .sort({ date: 1 });

        res.json(bookings);
    } catch (error) {
        console.error("Filter Provider Bookings Error:", error);
        res.status(500).json({ message: "Server error while filtering provider bookings" });
    }
};

// Submit rating & review (Seeker)
exports.submitReview = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { rating, review } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.seeker.toString() !== req.user.id)
            return res.status(403).json({ message: "Unauthorized" });

        if (booking.status !== "Completed")
            return res.status(400).json({ message: "Booking must be completed to submit review" });

        if (booking.rating) return res.status(400).json({ message: "Review already submitted" });

        // Update booking
        booking.rating = rating;
        booking.review = review;
        await booking.save();

        // Update provider reviews (check no duplicate)
        const provider = await Provider.findById(booking.provider);
        if (provider.reviews.some(r => r.booking.toString() === booking._id.toString())) {
            return res.status(400).json({ message: "Review already submitted" });
        }
        provider.reviews.push({ booking: booking._id, seeker: req.user.id, rating, review });
        await provider.updateRating();

        res.json({ message: "Review submitted successfully", booking });
    } catch (error) {
        console.error("Submit Review Error:", error);
        res.status(500).json({ message: "Server error while submitting review" });
    }
};

// Get all reviews for a provider
exports.getProviderReviews = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.providerId).populate("reviews.seeker", "userName");
        if (!provider) return res.status(404).json({ message: "Provider not found" });

        res.json({ rating: provider.rating, reviews: provider.reviews });
    } catch (error) {
        console.error("Get Provider Reviews Error:", error);
        res.status(500).json({ message: "Server error while fetching reviews" });
    }
};