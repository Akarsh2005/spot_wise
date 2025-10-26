import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Bookings.css";

const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/");

      const res = await axios.get("http://localhost:5001/api/bookings/provider", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (bookingId, status) => {
    let reason = "";
    if (status === "Rejected") {
      reason = prompt("Enter reason for rejection (e.g., I'm busy, Not available at this time):");
      if (!reason) return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const payload = { status };
      if (reason) payload.reason = reason;
      const res = await axios.put(
        `http://localhost:5001/api/bookings/provider/${bookingId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      fetchBookings();
    } catch (err) {
      console.error(err);
      toast.error("Error updating booking status");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("provider");
    navigate("/");
  };

  return (
    <div className="bookings-container">
      <nav className="navbar">
        <h2 className="logo">My Bookings</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/dashboard")} className="nav-button">Dashboard</button>
          <button onClick={() => navigate("/profile")} className="nav-button">Profile</button>
          <button onClick={handleLogout} className="nav-button logout">Logout</button>
        </div>
      </nav>

      <h2>Bookings</h2>
      {bookings.length === 0 ? (
        <p>No bookings available</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Seeker</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.seeker.userName}</td>
                <td>{b.seeker.email}</td>
                <td>{b.seeker.contactNumber}</td>
                <td>{b.serviceType}</td>
                <td>{new Date(b.date).toLocaleDateString()}</td>
                <td>{b.time}</td>
                <td>{b.status}</td>
                <td>{b.paymentStatus}</td>
                <td>₹{b.totalAmount}</td>
                <td>
                  <button onClick={() => handleStatusUpdate(b._id, "Accepted")}>Accept</button>
                  <button onClick={() => handleStatusUpdate(b._id, "Rejected")}>Reject</button>
                  <button onClick={() => handleStatusUpdate(b._id, "In Progress")}>In Progress</button>
                  <button onClick={() => handleStatusUpdate(b._id, "Completed")}>Complete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Bookings;