import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import "./dashboard.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [chartData, setChartData] = useState({});

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/");

      const res = await axios.get("http://localhost:5001/api/providers/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
      setNotifications(res.data.notifications || []);

      // Prepare earnings chart
      const earningsRes = await axios.get("http://localhost:5001/api/providers/earnings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const labels = earningsRes.data.earnings.map(e => `${e._id.month}/${e._id.year}`);
      const data = earningsRes.data.earnings.map(e => e.total);
      setChartData({ 
        labels, 
        datasets: [{ label: "Earnings", data, backgroundColor: "rgba(75,192,192,0.6)" }] 
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("provider");
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <h2 className="logo">Provider Dashboard</h2>
        <div className="nav-links">
          <button onClick={() => navigate("/profile")} className="nav-button">Profile</button>
          <button onClick={() => navigate("/bookings")} className="nav-button">Bookings</button>
          <button onClick={handleLogout} className="nav-button logout">Logout</button>
        </div>
      </nav>

      <h2>Stats</h2>
      <div className="stats">
        <div>Total Bookings: {stats.totalBookings}</div>
        <div>Completed: {stats.completedBookings}</div>
        <div>Pending: {stats.pendingBookings}</div>
        <div>Total Earnings: ₹{stats.totalEarnings}</div>
      </div>

      <h2>Earnings Chart</h2>
      {chartData.labels ? <Bar data={chartData} /> : <p>No earnings data yet</p>}

      <h2>Notifications</h2>
      {notifications.length === 0 ? <p>No new notifications</p> :
        <ul>
          {notifications.map(n => (
            <li key={n._id}>
              New booking from {n.seeker.userName} for {n.serviceType} on {new Date(n.date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      }
    </div>
  );
};

export default Dashboard;