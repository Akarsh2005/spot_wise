import Booking from "../models/bookingModel.js";
import Provider from "../models/providermodel.js";
import Chat from "../models/chatModel.js";

export const createBooking = async (req, res) => {
  try {
    const { providerId, serviceType, date, time } = req.body;

    if (!providerId || !serviceType || !date || !time)
      return res.status(400).json({ message: "Missing required fields" });

    const provider = await Provider.findById(providerId);
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    if (provider.status !== "online")
      return res.status(400).json({ message: "Provider is not currently available" });

    const booking = new Booking({
      seeker: req.user.id,
      provider: providerId,
      serviceType,
      date: new Date(date),
      time,
      totalCost: 0,
    });

    await booking.save();

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const providerSocketId = onlineUsers.get(providerId);
    if (providerSocketId) {
      io.to(providerSocketId).emit("new-booking", {
        bookingId: booking._id,
        seekerId: req.user.id,
        serviceType,
        date,
        time,
      });
    }

    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Server error while creating booking" });
  }
};

export const getSeekerBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { seeker: req.user.id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate("provider", "name skills pricing contactNumber rating")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);
    res.json({ bookings, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

export const getProviderBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { provider: req.user.id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate("seeker", "userName email contactNumber")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);
    res.json({ bookings, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, totalCost } = req.body;

    const validStatuses = ["Accepted", "Completed", "Rejected"];
    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.provider.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized: not your booking" });

    if (status) booking.status = status;
    if (totalCost !== undefined) booking.totalCost = totalCost;

    await booking.save();

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const seekerSocket = onlineUsers.get(booking.seeker.toString());

    if (seekerSocket) {
      io.to(seekerSocket).emit("booking_update", {
        bookingId: booking._id,
        status: booking.status,
        totalCost: booking.totalCost
      });
    }

    if (status === "Accepted") {
      let chat = await Chat.findOne({ booking: booking._id });

      if (!chat) {
        chat = await Chat.create({
          booking: booking._id,
          seeker: booking.seeker,
          provider: booking.provider
        });
      }

      if (seekerSocket) {
        io.to(seekerSocket).emit("booking_accepted", {
          bookingId: booking._id,
          chatId: chat._id,
          providerId: booking.provider,
        });
      }
      const providerSocket = onlineUsers.get(booking.provider.toString());
      if (providerSocket) {
        io.to(providerSocket).emit("booking_accepted", {
          bookingId: booking._id,
          chatId: chat._id,
          seekerId: booking.seeker,
        });
      }
    }

    res.json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating booking" });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.seeker.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized: not your booking" });

    if (["Completed", "Rejected"].includes(booking.status))
      return res.status(400).json({ message: "Cannot cancel this booking" });

    booking.status = "Rejected"; // Use Rejected or Cancelled (if added to enum later)
    await booking.save();

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const providerSocket = onlineUsers.get(booking.provider.toString());
    if (providerSocket) {
      io.to(providerSocket).emit("booking-cancelled", {
        bookingId: booking._id,
        seekerId: req.user.id,
      });
    }

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Server error while cancelling booking" });
  }
};

export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate("provider", "name skills pricing contactNumber rating")
      .populate("seeker", "userName email contactNumber");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isSeeker = booking.seeker._id.toString() === req.user.id;
    const isProvider = booking.provider._id.toString() === req.user.id;

    if (!isSeeker && !isProvider)
      return res.status(403).json({ message: "Unauthorized" });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching booking details" });
  }
};

export const submitReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: "Rating must be between 1 and 5" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.seeker.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    if (booking.status !== "Completed")
      return res.status(400).json({ message: "Booking must be completed before reviewing" });

    const provider = await Provider.findById(booking.provider);
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    // Check if booking is already reviewed
    if (booking.rating)
      return res.status(400).json({ message: "Review already submitted for this booking" });

    // Save review data to the booking
    booking.rating = rating;
    booking.review = review;
    await booking.save();

    provider.reviews.push({
      seeker: req.user.id,
      booking: booking._id,
      rating,
      comment: review,
    });

    await provider.save();
    await provider.updateRating();

    res.json({ message: "Review submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error while submitting review" });
  }
};