// components/Notification.jsx
import { useEffect } from "react";
import { toast } from "react-toastify";
import { getSocket } from "../utils/socket";
import { getRole } from "../utils/auth";

// ─────────────────────────────────────────────────────
// Notification component
// Mounted once in App.jsx — no UI, just a socket listener.
// Fires React Toastify toasts on socket events.
// ─────────────────────────────────────────────────────

const Notification = () => {
  const role = getRole();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ── Provider events ───────────────────────────
    // New booking request from a seeker
    const onNewBooking = (data) => {
      toast.info(
        `📋 New booking request for ${data.serviceType || "a service"}`,
        {
          toastId: `new-booking-${data.bookingId}`,
          autoClose: 6000,
        }
      );
    };

    // ── Seeker events ─────────────────────────────
    // Provider accepted or updated the booking status
    const onBookingUpdate = ({ bookingId, status, reason }) => {
      switch (status) {
        case "Accepted":
          toast.success("✅ Your booking was accepted! Chat is now open.", {
            toastId: `update-${bookingId}`,
            autoClose: 5000,
          });
          break;
        case "Rejected":
          toast.error(
            `❌ Booking rejected.${reason ? ` Reason: ${reason}` : ""}`,
            { toastId: `update-${bookingId}`, autoClose: 6000 }
          );
          break;
        case "In Progress":
          toast.info("🔧 Provider has started working on your request.", {
            toastId: `update-${bookingId}`,
          });
          break;
        case "Completed":
          toast.success("🎉 Service completed! Please leave a review.", {
            toastId: `update-${bookingId}`,
            autoClose: 7000,
          });
          break;
        case "Cancelled":
          toast.warning("⚠️ A booking was cancelled.", {
            toastId: `update-${bookingId}`,
          });
          break;
        default:
          toast.info(`Booking status updated to ${status}`, {
            toastId: `update-${bookingId}`,
          });
      }
    };

    // ── Both roles ────────────────────────────────
    // Booking accepted → chat is now open (auto handled in ChatPopup)
    // We just show a toast here as confirmation
    const onBookingAccepted = (data) => {
      const msg =
        role === "provider"
          ? "💬 Chat opened with the seeker"
          : "💬 Chat opened with the provider";
      toast.success(msg, {
        toastId: `accepted-${data.bookingId}`,
        autoClose: 4000,
      });
    };

    // Booking cancelled by seeker (provider gets this)
    const onBookingCancelled = (data) => {
      toast.warning("⚠️ A booking was cancelled by the seeker.", {
        toastId: `cancelled-${data.bookingId}`,
      });
    };

    // ── Register listeners ────────────────────────
    if (role === "provider") {
      socket.on("new-booking", onNewBooking);
      socket.on("booking-cancelled", onBookingCancelled);
    }

    if (role === "seeker") {
      socket.on("booking_update", onBookingUpdate);
    }

    // Both roles get the accepted notification toast
    socket.on("booking_accepted", onBookingAccepted);

    // ── Cleanup ───────────────────────────────────
    return () => {
      socket.off("new-booking", onNewBooking);
      socket.off("booking_update", onBookingUpdate);
      socket.off("booking_accepted", onBookingAccepted);
      socket.off("booking-cancelled", onBookingCancelled);
    };
  }, [role]);

  // No UI — this component is purely a side-effect listener
  return null;
};

export default Notification;