import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import "./mybooking.css";

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [reviewData, setReviewData] = useState({}); // { bookingId: {rating, review} }

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
      toast.error(err.response?.data?.message || "Error fetching bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleReviewChange = (bookingId, field, value) => {
    setReviewData(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [field]: value }
    }));
  };

  const submitReview = async (bookingId) => {
    const { rating, review } = reviewData[bookingId] || {};
    if (!rating) return toast.error('Please provide a rating');

    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5001/api/bookings/review/${bookingId}`, { rating, review }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Review submitted!');
      fetchBookings(); // Refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting review');
    }
  };

  return (
    <div className="mybookings-container">
      <h2>My Bookings</h2>

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
              {booking.status === 'Completed' && !booking.rating && (
                <div className="review-form">
                  <label>Rating (1-5):</label>
                  <input 
                    type="number" 
                    min="1" max="5" 
                    onChange={(e) => handleReviewChange(booking._id, 'rating', e.target.value)} 
                  />
                  <label>Review:</label>
                  <textarea 
                    onChange={(e) => handleReviewChange(booking._id, 'review', e.target.value)} 
                  />
                  <button onClick={() => submitReview(booking._id)}>Submit Review</button>
                </div>
              )}
              {booking.rating && (
                <p><strong>Your Review:</strong> Rating {booking.rating}, {booking.review}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;