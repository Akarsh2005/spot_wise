// provider/Bookings.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Bookings.css";

const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

  // ✅ Fetch provider bookings
  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/bookings/provider`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch (err) {
      toast.error("Error fetching bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // ✅ Update booking status
  const handleStatusUpdate = async (id, status) => {
    let reason = "";
    if (status === "Rejected") {
      reason = prompt("Enter reason for rejection:");
      if (!reason) return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/bookings/provider/${id}`,
        { status, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Status updated!");
      fetchBookings();
    } catch {
      toast.error("Error updating status");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Start chat with seeker
  const startChat = async (seekerId) => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_URL}/api/chats`,
        { userId: seekerId }, // ✅ backend expects only userId
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Chat opened!");
      navigate(`/chat/${data._id}`);
    } catch (err) {
      console.error("Chat Error:", err.response?.data);
      toast.error(err.response?.data?.message || "Error starting chat");
    }
  };

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("provider");
    navigate("/");
  };

  return (
    <div className="bookings-container">
      <nav className="navbar">
        <h2>My Bookings</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button onClick={() => navigate("/profile")}>Profile</button>
          <button onClick={() => navigate("/chatpage")}>Chats</button>
          <button onClick={handleLogout} className="logout">
            Logout
          </button>
        </div>
      </nav>

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
              <th>Total</th>
              <th>Actions</th>
              <th>Chat</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.seeker?.userName}</td>
                <td>{b.seeker?.email}</td>
                <td>{b.seeker?.contactNumber}</td>
                <td>{b.serviceType}</td>
                <td>{new Date(b.date).toLocaleDateString()}</td>
                <td>{b.time}</td>
                <td>{b.status}</td>
                <td>₹{b.totalAmount}</td>
                <td>
                  <button
                    disabled={loading}
                    onClick={() => handleStatusUpdate(b._id, "Accepted")}
                  >
                    Accept
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleStatusUpdate(b._id, "Rejected")}
                  >
                    Reject
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleStatusUpdate(b._id, "In Progress")}
                  >
                    In Progress
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleStatusUpdate(b._id, "Completed")}
                  >
                    Complete
                  </button>
                </td>
                <td>
                  <button onClick={() => startChat(b.seeker?._id)}>Chat</button>
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
