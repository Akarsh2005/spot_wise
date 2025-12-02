// seeker/MyBookings.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./mybooking.css";

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [reviewData, setReviewData] = useState({});

  const API_URL = "http://localhost:5001";

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const res = await axios.get(`${API_URL}/api/bookings/seeker`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("seeker");
    navigate("/login");
  };

  const handleReviewChange = (bookingId, field, value) => {
    setReviewData((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [field]: value },
    }));
  };

  const submitReview = async (bookingId) => {
    const { rating, review } = reviewData[bookingId] || {};
    if (!rating) return toast.error("Please add a rating");

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/bookings/review/${bookingId}`,
        { rating, review },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Review submitted!");
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error submitting review");
    }
  };

  const startChat = async (providerId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/chats`,
        { userId: providerId, userType: "Provider" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/chat/${res.data._id}`);
    } catch {
      toast.error("Error starting chat");
    }
  };

  return (
    <div className="mybookings-container">
      <nav className="navbar">
        <h2>My Bookings</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button onClick={() => navigate("/profile")}>Profile</button>
          <button onClick={() => navigate("/chats")}>Chats</button>
          <button onClick={handleLogout} className="logout">Logout</button>
        </div>
      </nav>

      {bookings.length === 0 ? (
        <p className="no-bookings">No bookings found</p>
      ) : (
        <div className="bookings-list">
          {bookings.map((b) => (
            <div key={b._id} className="booking-card">
              <h3>Provider: {b.provider?.name}</h3>
              <p><strong>Service:</strong> {b.serviceType}</p>
              <p><strong>Date:</strong> {new Date(b.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {b.time}</p>
              <p><strong>Status:</strong> {b.status}</p>
              <p><strong>Total:</strong> ₹{b.totalAmount}</p>
              {b.status === "Completed" && !b.rating && (
                <div className="review-section">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="Rating"
                    onChange={(e) => handleReviewChange(b._id, "rating", e.target.value)}
                  />
                  <textarea
                    placeholder="Write review..."
                    onChange={(e) => handleReviewChange(b._id, "review", e.target.value)}
                  />
                  <button onClick={() => submitReview(b._id)}>Submit</button>
                </div>
              )}
              {b.rating && (
                <p><strong>Your Review:</strong> ⭐{b.rating} — {b.review}</p>
              )}
              <button onClick={() => startChat(b.provider?._id)}>Chat with Provider</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
