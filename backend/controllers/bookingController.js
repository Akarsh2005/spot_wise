// backend/controllers/bookingController.js
import Booking from "../models/bookingModel.js";
import Provider from "../models/providermodel.js";
import Seeker from "../models/seekermodel.js";
import Chat from "../models/chatModel.js";

export const createBooking = async (req, res) => {
  try {
    const { providerId, serviceType, date, time, address, instructions, totalAmount } = req.body;
    if (!providerId || !serviceType || !date || !time || !address)
      return res.status(400).json({ message: "Missing required fields" });

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

    // Emit real-time notification to provider if online
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

export const getSeekerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ seeker: req.user.id })
      .populate("provider", "name skills rate contactNumber")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error("Get Seeker Bookings Error:", error);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

export const getProviderBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ provider: req.user.id })
      .populate("seeker", "userName email contactNumber")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error("Get Provider Bookings Error:", error);
    res.status(500).json({ message: "Server error while fetching bookings" });
  }
};

// backend/controllers/bookingController.js (update the status update part)
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, paymentStatus, reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.provider.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (reason) booking.reason = reason;

    await booking.save();

    // Emit update to seeker
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

    // When provider accepts, auto-create chat
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
            { 
              user: booking.seeker, 
              modelRef: "Seeker" 
            },
            { 
              user: booking.provider, 
              modelRef: "Provider" 
            },
          ],
        });
        
        // Populate the new chat
        chat = await Chat.findById(chat._id)
          .populate("participants.user", "name userName email");
      }

      // Notify both users about the chat
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

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.seeker.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    if (["Completed", "Cancelled"].includes(booking.status))
      return res.status(400).json({ message: "Cannot cancel this booking" });

    booking.status = "Cancelled";
    await booking.save();

    // notify provider
    const onlineUsers = req.app.get("onlineUsers");
    const io = req.app.get("io");
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

export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate("provider", "name skills rate contactNumber")
      .populate("seeker", "userName email contactNumber");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (
      booking.seeker._id.toString() !== req.user.id &&
      booking.provider._id.toString() !== req.user.id
    )
      return res.status(403).json({ message: "Unauthorized" });

    res.json(booking);
  } catch (error) {
    console.error("Get Booking Details Error:", error);
    res.status(500).json({ message: "Server error while fetching booking details" });
  }
};

// 📝 Submit Review
export const submitReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.seeker.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    if (booking.status !== "Completed")
      return res.status(400).json({ message: "Booking must be completed to review" });

    if (booking.rating)
      return res.status(400).json({ message: "Review already submitted" });

    booking.rating = rating;
    booking.review = review;
    await booking.save();

    const provider = await Provider.findById(booking.provider);
    provider.reviews.push({ booking: booking._id, seeker: req.user.id, rating, review });
    await provider.save();

    res.json({ message: "Review submitted successfully", booking });
  } catch (error) {
    console.error("Submit Review Error:", error);
    res.status(500).json({ message: "Server error while submitting review" });
  }
};
