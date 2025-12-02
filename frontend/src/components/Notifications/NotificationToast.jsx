// seeker/src/components/Notifications/NotificationToast.jsx
import React, { useEffect } from "react";
import { toast } from "react-toastify";
import { socket } from "../../socket";

const NotificationToast = ({ onBookingAccepted }) => {
  useEffect(() => {
    socket.on("new-booking", (data) => {
      toast.info(`New booking: ${data.serviceType} on ${new Date(data.date).toLocaleDateString()}`);
    });

    socket.on("booking-update", (data) => {
      toast.info(`Booking ${data.bookingId} status: ${data.status}`);
    });

    socket.on("booking-accepted", (data) => {
      toast.success("Your booking was accepted — chat is ready.");
      if (onBookingAccepted) onBookingAccepted(data);
    });

    socket.on("message received", (msg) => {
      // if you want to show toast for incoming messages when not on that chat
      toast.info(`New message from ${msg.sender?.user?.name || msg.sender?.user?.userName}`);
    });

    return () => {
      socket.off("new-booking");
      socket.off("booking-update");
      socket.off("booking-accepted");
      socket.off("message received");
    };
  }, [onBookingAccepted]);

  return null;
};

export default NotificationToast;
