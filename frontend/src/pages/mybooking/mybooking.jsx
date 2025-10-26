import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./mybooking.css";

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      const res = await axios.get("http://localhost:5001/api/bookings/seeker", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookings(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="mybookings-container">
      <h2>My Bookings</h2>
      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <p className="no-bookings">You have no bookings yet.</p>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <h3>Provider: {booking.provider.name}</h3>
              <p><strong>Service:</strong> {booking.serviceType}</p>
              <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {booking.time}</p>
              <p><strong>Status:</strong> {booking.status}</p>
              <p><strong>Payment:</strong> {booking.paymentStatus}</p>
              <p>
                <strong>Address:</strong> {booking.address.street}, {booking.address.city}, {booking.address.state}, {booking.address.postalCode}, {booking.address.country}
              </p>
              <p><strong>Total Amount:</strong> ₹{booking.totalAmount}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
