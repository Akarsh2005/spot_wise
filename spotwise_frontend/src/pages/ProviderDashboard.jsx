import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, logout, decodeToken } from "../utils/auth";
import { getSocket } from "../utils/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const user = decodeToken();

  const [isOnline, setIsOnline] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookingsRes, profileRes] = await Promise.all([
          axios.get(`${API}/api/bookings/provider`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          axios.get(`${API}/api/providers/profile`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
        ]);

        const allBookings = bookingsRes.data.bookings || bookingsRes.data;
        setPendingBookings(allBookings.filter((b) => b.status === "Pending"));
        setAcceptedBookings(allBookings.filter((b) => b.status === "Accepted"));
        setIsOnline(profileRes.data.status === "online");
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewBooking = (data) => {
      toast.info("New booking request received!");
      axios
        .get(`${API}/api/bookings/provider`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        .then((res) => {
          const all = res.data.bookings || res.data;
          setPendingBookings(all.filter((b) => b.status === "Pending"));
        })
        .catch(() => {});
    };

    socket.on("new-booking", onNewBooking);
    return () => socket.off("new-booking", onNewBooking);
  }, []);

  // Auto-sync GPS Location on dashboard load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axios.put(
              `${API}/api/providers/location`,
              { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
              { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            console.log("GPS Location auto-synced successfully");
          } catch (err) {
            console.error("Auto-sync location failed:", err);
          }
        },
        (err) => {
          console.warn("Auto-sync location permission denied or failed.");
        }
      );
    }
  }, []);

  const toggleOnline = async (checked) => {
    const newStatus = checked ? "online" : "offline";
    try {
      await axios.put(
        `${API}/api/providers/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setIsOnline(checked);
      toast.success(checked ? "You are now online and visible on the map!" : "You are now hidden from the map.");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleBookingAction = async (bookingId, status, totalCost = undefined) => {
    setActionLoading(bookingId);
    try {
      const payload = { status };
      if (totalCost !== undefined) payload.totalCost = totalCost;

      await axios.put(
        `${API}/api/bookings/provider/${bookingId}`,
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (status === "Accepted") {
        const found = pendingBookings.find((b) => b._id === bookingId);
        setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));
        if (found) setAcceptedBookings((prev) => [{ ...found, status }, ...prev]);
        toast.success("Booking accepted! The chat room is now open.");
      } else if (status === "Rejected") {
        setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));
        toast.info("Booking rejected.");
      } else if (status === "Completed") {
        setAcceptedBookings((prev) => prev.filter((b) => b._id !== bookingId));
        toast.success("Job marked as Completed!");
      }
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = (bookingId) => {
    const cost = window.prompt("Enter the final total cost for this job (₹):");
    if (cost === null) return; // User cancelled prompt
    
    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      return toast.error("Please enter a valid amount.");
    }
    
    handleBookingAction(bookingId, "Completed", parsedCost);
  };

  const openChat = (seekerId) => {
    window.dispatchEvent(
      new CustomEvent("open-chat-with", { detail: { userId: seekerId } })
    );
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 mx-4 mt-4 mb-8 flex justify-between items-center">
        <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
          Spot<span className="text-slate-800">Wise</span> <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md ml-2">Provider</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-semibold text-indigo-600 cursor-pointer">Dashboard</span>
          <span 
            className="font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            onClick={() => navigate("/provider/profile")}
          >
            Profile & Settings
          </span>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {user?.id?.[0]?.toUpperCase() || "P"}
            </div>
            <button onClick={() => { logout(); navigate("/auth"); }} className="text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container max-w-5xl">
        
        {/* Header & Status Toggle */}
        <div className="glass-card p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-l-indigo-500">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Command Center</h1>
            <p className="text-slate-500">Manage your incoming requests and active jobs.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Visibility:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isOnline}
                onChange={(e) => toggleOnline(e.target.checked)}
              />
              <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
            <span className={`font-bold ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending Requests Column */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xl font-bold text-slate-800">New Requests</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                {pendingBookings.length} Pending
              </span>
            </div>

            <div className="space-y-4">
              {pendingBookings.length === 0 ? (
                <div className="glass-card p-8 text-center text-slate-500 border-dashed border-2">
                  <div className="text-4xl mb-2">📥</div>
                  <p>No new requests at the moment.</p>
                </div>
              ) : (
                pendingBookings.map((b) => (
                  <div key={b._id} className="glass-card p-5 border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{b.serviceType}</h3>
                        <p className="text-sm text-slate-500">Requested by <span className="font-semibold text-indigo-600">{b.seeker?.userName || "Seeker"}</span></p>
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded">
                        {formatDate(b.date)} at {b.time}
                      </span>
                    </div>
                    
                    <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => handleBookingAction(b._id, "Accepted")}
                        disabled={actionLoading === b._id}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors"
                      >
                        {actionLoading === b._id ? "..." : "Accept Job"}
                      </button>
                      <button 
                        onClick={() => handleBookingAction(b._id, "Rejected")}
                        disabled={actionLoading === b._id}
                        className="px-4 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 font-medium py-2 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Jobs Column */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xl font-bold text-slate-800">Active Jobs</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                {acceptedBookings.length} Active
              </span>
            </div>

            <div className="space-y-4">
              {acceptedBookings.length === 0 ? (
                <div className="glass-card p-8 text-center text-slate-500 border-dashed border-2">
                  <div className="text-4xl mb-2">🛠️</div>
                  <p>No active jobs. Accept requests to start working!</p>
                </div>
              ) : (
                acceptedBookings.map((b) => (
                  <div key={b._id} className="glass-card p-5 border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{b.serviceType}</h3>
                        <p className="text-sm text-slate-500">Client: <span className="font-semibold text-slate-700">{b.seeker?.userName || "Seeker"}</span></p>
                      </div>
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        Accepted
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded-md">
                      <span>📅 {formatDate(b.date)}</span>
                      <span className="text-slate-300">|</span>
                      <span>⏰ {b.time}</span>
                    </div>
                    
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => openChat(b.seeker._id)}
                        className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        💬 Open Chat
                      </button>
                      <button 
                        onClick={() => handleComplete(b._id)}
                        disabled={actionLoading === b._id}
                        className="flex-1 border border-green-500 text-green-600 hover:bg-green-50 font-medium py-2 rounded-lg transition-colors"
                      >
                        {actionLoading === b._id ? "..." : "✓ Mark Complete"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;