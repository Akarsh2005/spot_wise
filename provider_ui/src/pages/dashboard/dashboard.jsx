// Provider UI - Enhanced Dashboard with Location Tracking, Notifications & Earnings Chart
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { toast } from "react-toastify";
import "./dashboard.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Getting location...");
  const locationIntervalRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

  // ✅ Get current geolocation
  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error("Failed to get location: " + error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

  // ✅ Send location to server (UPDATED)
  const updateLocation = async () => {
    try {
      const location = await getCurrentLocation();
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `${API_URL}/api/providers/location`,
        {
          latitude: location.latitude,
          longitude: location.longitude
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setLocationStatus(
        `📍 Location updated: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      );

      console.log("✅ Provider location updated:", response.data);
    } catch (error) {
      console.error("Location update error:", error);
      setLocationStatus("❌ Location update failed");
    }
  };

  // ✅ Start background location updates
  const startLocationUpdates = () => {
    updateLocation(); // first call
    locationIntervalRef.current = setInterval(updateLocation, 30000); // every 30s
  };

  // ✅ Stop updates
  const stopLocationUpdates = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setLocationStatus("Location updates stopped");
  };

  // ✅ Toggle location updates
  const toggleLocationUpdates = () => {
    if (locationIntervalRef.current) {
      stopLocationUpdates();
    } else {
      startLocationUpdates();
    }
  };

  // ✅ Fetch dashboard + earnings
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return navigate("/");

      // Dashboard stats + notifications
      const res = await axios.get(`${API_URL}/api/providers/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
      setNotifications(res.data.notifications || []);

      // Earnings data for chart
      const earningsRes = await axios.get(`${API_URL}/api/providers/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const labels = earningsRes.data.earnings.map(
        (e) => `${e._id.month}/${e._id.year}`
      );
      const data = earningsRes.data.earnings.map((e) => e.total);
      setChartData({
        labels,
        datasets: [
          {
            label: "Earnings (₹)",
            data,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderRadius: 6,
          },
        ],
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initialize
  useEffect(() => {
    fetchDashboard();
    startLocationUpdates();

    return () => stopLocationUpdates(); // cleanup
  }, []);

  // ✅ Logout
  const handleLogout = () => {
    stopLocationUpdates();
    localStorage.removeItem("token");
    localStorage.removeItem("provider");
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <h2 className="logo" onClick={() => navigate("/dashboard")}>
          Provider Dashboard
        </h2>
        <div className="nav-links">
          <button onClick={() => navigate("/profile")} className="nav-button">
            Profile
          </button>
          <button onClick={() => navigate("/bookings")} className="nav-button">
            Bookings
          </button>
          <button onClick={handleLogout} className="nav-button logout">
            Logout
          </button>
        </div>
      </nav>

      {/* LOCATION STATUS */}
      <div className="location-status">
        <div className="location-info">
          <span>{locationStatus}</span>
          <button
            onClick={toggleLocationUpdates}
            className="location-toggle-btn"
          >
            {locationIntervalRef.current ? "🟢 Stop Updates" : "🔴 Start Updates"}
          </button>
        </div>
        <small>Your location is automatically shared with seekers nearby</small>
      </div>

      {/* NOTIFICATIONS */}
      <section className="notifications-section">
        <h2>Recent Notifications</h2>
        {notifications.length === 0 ? (
          <p className="no-notifications">No new notifications 🎉</p>
        ) : (
          <ul className="notifications-list">
            {notifications.map((n) => (
              <li key={n._id} className="notification-card">
                <div className="notification-text">
                  <strong>{n.seeker?.userName}</strong> booked a{" "}
                  <span className="highlight">{n.serviceType}</span> service for{" "}
                  {new Date(n.date).toLocaleDateString()}
                </div>
                <button
                  className="view-booking-btn"
                  onClick={() => navigate("/bookings")}
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* STATS OVERVIEW */}
      <section className="stats-section">
        <h2>Stats Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Bookings</h3>
            <p>{stats.totalBookings || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Completed</h3>
            <p>{stats.completedBookings || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p>{stats.pendingBookings || 0}</p>
          </div>
          <div className="stat-card earnings">
            <h3>Total Earnings</h3>
            <p>₹{stats.totalEarnings || 0}</p>
          </div>
        </div>
      </section>

      {/* EARNINGS CHART */}
      <section className="chart-section">
        <h2>Earnings Overview</h2>
        {chartData.labels?.length ? (
          <Bar data={chartData} />
        ) : (
          <p>No earnings data available yet</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
