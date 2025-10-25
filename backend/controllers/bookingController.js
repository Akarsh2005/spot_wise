import Booking from "../models/bookingModel.js";
import Provider from "../models/providermodel.js";
import Seeker from "../models/seekermodel.js";

// Create a new booking (by seeker)
export const createBooking = async (req, res) => {
    try {
        const { providerId, serviceType, date, time, address, totalAmount } = req.body;

        // Validate provider exists
        const provider = await Provider.findById(providerId);
        if (!provider) return res.status(404).json({ message: "Provider not found" });

        const booking = new Booking({
            seeker: req.user.id, // obtained from auth middleware
            provider: providerId,
            serviceType,
            date,
            time,
            address,
            totalAmount,
        });

        await booking.save();
        res.status(201).json({ message: "Booking created successfully", booking });
    } catch (error) {
        console.error("Create Booking Error:", error);
        res.status(500).json({ message: "Server error while creating booking" });
    }
};

// Get all bookings for seeker
export const getSeekerBookings = async (req, res) => {
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
export const getProviderBookings = async (req, res) => {
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

// Update booking status (by provider)
export const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, paymentStatus } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Only provider of this booking can update status
        if (booking.provider.toString() !== req.user.id)
            return res.status(403).json({ message: "Unauthorized" });

        if (status) booking.status = status;
        if (paymentStatus) booking.paymentStatus = paymentStatus;

        await booking.save();
        res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
        console.error("Update Booking Status Error:", error);
        res.status(500).json({ message: "Server error while updating booking" });
    }
};

// Get single booking details
export const getBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId)
            .populate("provider", "name skills rate contactNumber")
            .populate("seeker", "userName email contactNumber");

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Only involved seeker or provider can view
        if (booking.seeker._id.toString() !== req.user.id && booking.provider._id.toString() !== req.user.id)
            return res.status(403).json({ message: "Unauthorized" });

        res.json(booking);
    } catch (error) {
        console.error("Get Booking Details Error:", error);
        res.status(500).json({ message: "Server error while fetching booking details" });
    }
};
