import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  // Fetch provider bookings
  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      const res = await axios.get(
        "http://localhost:5001/api/bookings/dashboard-bookings",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBookings(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("provider");
    navigate("/");
  };

  return (
    <div className="provider-dashboard-container">
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo" onClick={fetchBookings}>Provider Portal</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/provider-profile")} className="nav-button">Profile</button>
          <button onClick={handleLogout} className="nav-button logout">Logout</button>
        </div>
      </nav>

      <h2>Bookings</h2>
      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <p className="no-bookings">No bookings available.</p>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <h3>Seeker: {booking.seeker.userName}</h3>
              <p><strong>Email:</strong> {booking.seeker.email}</p>
              <p><strong>Contact:</strong> {booking.seeker.contactNumber}</p>
              <p><strong>Service:</strong> {booking.serviceType}</p>
              <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {booking.time}</p>
              <p><strong>Status:</strong> {booking.status}</p>
              <p><strong>Payment Status:</strong> {booking.paymentStatus}</p>
              <p><strong>Total Amount:</strong> ₹{booking.totalAmount}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
