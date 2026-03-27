// controllers/bookingController.js
import Booking from "../models/bookingModel.js";
import Provider from "../models/providermodel.js";
import Chat from "../models/chatModel.js";

// ✅ Create Booking (Seeker only — enforced via requireRole in route)
export const createBooking = async (req, res) => {
  try {
    const { providerId, serviceType, date, time, address, instructions, totalAmount } = req.body;

    if (!providerId || !serviceType || !date || !time || !address)
      return res.status(400).json({ message: "Missing required fields" });

    if (!address.street || !address.city)
      return res.status(400).json({ message: "Address street and city are required" });

    // Validate totalAmount
    if (totalAmount !== undefined && (isNaN(totalAmount) || totalAmount < 0))
      return res.status(400).json({ message: "Invalid totalAmount" });

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
      address,
      instructions,
      totalAmount: totalAmount || 0,
    });

    await booking.save();

    // 📡 Real-time notification to provider if online
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
    console.error("Create Booking Error:", error);
    res.status(500).json({ message: "Server error while creating booking" });
  }
};

// ✅ Get Seeker's Bookings (with pagination)
export const getSeekerBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { seeker: req.user.id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate("provider", "name skills rate contactNumber rating")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);
    res.json({ bookings, total, page: parseInt(page) });
  } catch (error) {
    console.error("Get Seeker Bookings Error:", error);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

// ✅ Get Provider's Bookings (with pagination)
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
    console.error("Get Provider Bookings Error:", error);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

// ✅ Update Booking Status (Provider only — enforced via requireRole in route)
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, paymentStatus, reason } = req.body;

    const validStatuses = ["Accepted", "In Progress", "Completed", "Rejected"];
    if (status && !validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Ensure this provider owns this booking
    if (booking.provider.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized: not your booking" });

    if (status) booking.status = status;
    if (reason) booking.reason = reason;

    // FIX: Set paidAt timestamp when payment is marked as Paid
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
      if (paymentStatus === "Paid" && !booking.paidAt) {
        booking.paidAt = new Date();
      }
    }

    await booking.save();

    // 📡 Notify seeker about the update
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const seekerId = booking.seeker.toString();
    const seekerSocket = onlineUsers.get(seekerId);

    if (seekerSocket) {
      io.to(seekerSocket).emit("booking_update", {
        bookingId: booking._id,
        status: booking.status,
        reason: booking.reason || null,
      });
    }

    // 💬 Auto-create chat when provider accepts
    if (status === "Accepted") {
      let chat = await Chat.findOne({
        $and: [
          { "participants.user": booking.seeker },
          { "participants.user": booking.provider },
        ],
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [
            { user: booking.seeker, modelRef: "Seeker" },
            { user: booking.provider, modelRef: "Provider" },
          ],
        });
        chat = await Chat.findById(chat._id).populate(
          "participants.user",
          "name userName email"
        );
      }

      // Notify both parties about the new chat
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
    console.error("Update Booking Status Error:", error);
    res.status(500).json({ message: "Server error while updating booking" });
  }
};

// ✅ Cancel Booking (Seeker only — enforced via requireRole in route)
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Ensure this seeker owns this booking
    if (booking.seeker.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized: not your booking" });

    if (["Completed", "Cancelled"].includes(booking.status))
      return res.status(400).json({ message: "Cannot cancel this booking" });

    booking.status = "Cancelled";
    await booking.save();

    // 📡 Notify provider
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
    console.error("Cancel Booking Error:", error);
    res.status(500).json({ message: "Server error while cancelling booking" });
  }
};

// ✅ Get Booking Details (accessible to both seeker and provider of that booking)
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate("provider", "name skills rate contactNumber rating")
      .populate("seeker", "userName email contactNumber");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isSeeker = booking.seeker._id.toString() === req.user.id;
    const isProvider = booking.provider._id.toString() === req.user.id;

    if (!isSeeker && !isProvider)
      return res.status(403).json({ message: "Unauthorized" });

    res.json(booking);
  } catch (error) {
    console.error("Get Booking Details Error:", error);
    res.status(500).json({ message: "Server error while fetching booking details" });
  }
};

// 📝 Submit Review (Seeker only — enforced via requireRole in route)
// FIX: updateRating() is now called after saving the review
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

    if (booking.rating)
      return res.status(400).json({ message: "Review already submitted for this booking" });

    booking.rating = rating;
    booking.review = review;
    await booking.save();

    const provider = await Provider.findById(booking.provider);
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    provider.reviews.push({
      booking: booking._id,
      seeker: req.user.id,
      rating,
      review,
    });

    await provider.save();

    // FIX: Actually call updateRating() — was missing before, rating stayed at 0
    await provider.updateRating();

    res.json({ message: "Review submitted successfully", booking });
  } catch (error) {
    console.error("Submit Review Error:", error);
    res.status(500).json({ message: "Server error while submitting review" });
  }
};