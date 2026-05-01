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
  const [completedBookings, setCompletedBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Invoice Modal State
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, bookingId: null });
  const [invoiceData, setInvoiceData] = useState({ hoursWorked: "", extras: [] });

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
        setCompletedBookings(allBookings.filter((b) => b.status === "Completed"));
        setIsOnline(profileRes.data.status === "online");
        setReviews(profileRes.data.reviews || []);
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

  const handleBookingAction = async (bookingId, status, hoursWorked = undefined, extrasList = undefined) => {
    setActionLoading(bookingId);
    try {
      const payload = { status };
      if (hoursWorked !== undefined) payload.hoursWorked = hoursWorked;
      if (extrasList !== undefined) payload.extrasList = extrasList;

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
      } else if (status === "Payment Pending") {
        const found = acceptedBookings.find((b) => b._id === bookingId);
        setAcceptedBookings((prev) => prev.filter((b) => b._id !== bookingId));
        if (found) setCompletedBookings((prev) => [{ ...found, status }, ...prev]);
        toast.success("Invoice sent! Waiting for seeker to pay.");
      }
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenInvoiceModal = (bookingId) => {
    setInvoiceModal({ isOpen: true, bookingId });
    setInvoiceData({ hoursWorked: "", extras: [] });
  };

  const handleAddExtra = () => {
    setInvoiceData({ ...invoiceData, extras: [...invoiceData.extras, { name: "", price: "" }] });
  };

  const handleExtraChange = (index, field, value) => {
    const updatedExtras = [...invoiceData.extras];
    updatedExtras[index][field] = value;
    setInvoiceData({ ...invoiceData, extras: updatedExtras });
  };

  const handleRemoveExtra = (index) => {
    setInvoiceData({ ...invoiceData, extras: invoiceData.extras.filter((_, i) => i !== index) });
  };

  const submitInvoice = () => {
    const hoursWorked = parseFloat(invoiceData.hoursWorked) || 0;
    if (hoursWorked < 0) return toast.error("Invalid hours");

    const validExtras = invoiceData.extras
      .filter(ex => ex.name.trim() !== "" && ex.price !== "")
      .map(ex => ({ name: ex.name.trim(), price: parseFloat(ex.price) || 0 }));

    handleBookingAction(invoiceModal.bookingId, "Payment Pending", hoursWorked, validExtras);
    setInvoiceModal({ isOpen: false, bookingId: null });
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

  const handleLogout = async () => {
    try {
      // Set status offline on logout to remove marker from map
      await axios.put(
        `${API}/api/providers/status`,
        { status: "offline" },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
    } catch (err) {
      console.error("Failed to set offline on logout", err);
    } finally {
      logout();
      navigate("/auth");
    }
  };

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
      <nav className="glass sticky top-0 z-50 px-4 md:px-6 py-4 mx-2 md:mx-4 mt-4 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
          Spot<span className="text-slate-800">Wise</span> <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md ml-2">Provider</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-semibold text-indigo-600 cursor-pointer">Dashboard</span>
          
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => navigate("/provider/profile")}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  ⚙️ Profile & Settings
                </button>
                <button 
                  onClick={() => {
                     setDropdownOpen(false);
                     document.getElementById("reviews-section")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  ⭐ My Reviews
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button 
                  onClick={handleLogout} 
                  className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="page-container max-w-5xl">
        
        {/* Header & Status Toggle */}
        <div className="glass-card p-6 mb-8 flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-6 border-l-4 border-l-indigo-500">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Command Center</h1>
            <p className="text-slate-500">Manage your incoming requests and active jobs.</p>
          </div>
          
          <div className="flex items-center justify-center gap-4 bg-slate-50 px-6 py-3 rounded-xl border border-slate-200 w-full sm:w-auto">
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

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Earnings</p>
              <h3 className="text-2xl font-black text-slate-800">₹{completedBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0)}</h3>
            </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Jobs Completed</p>
              <h3 className="text-2xl font-black text-slate-800">{completedBookings.length}</h3>
            </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-2xl">
              ⭐
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Average Rating</p>
              <h3 className="text-2xl font-black text-slate-800">
                {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "New"}
              </h3>
            </div>
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
                        onClick={() => handleOpenInvoiceModal(b._id)}
                        disabled={actionLoading === b._id}
                        className="flex-1 border border-green-500 text-green-600 hover:bg-green-50 font-medium py-2 rounded-lg transition-colors"
                      >
                        {actionLoading === b._id ? "..." : "✓ Generate Invoice"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Reviews Section */}
        <div id="reviews-section" className="mt-12 glass-card p-6 border-t-4 border-t-yellow-400">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Client Reviews ({reviews.length})</h2>
          
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2 opacity-50">⭐</div>
              <p className="text-slate-500 font-medium">No reviews yet. Complete more jobs to earn ratings!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r, i) => (
                <div key={i} className="bg-slate-50 p-5 rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-1 text-lg">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= r.rating ? "text-yellow-400 drop-shadow-sm" : "text-slate-200"}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-100">
                      {formatDate(r.createdAt || new Date())}
                    </span>
                  </div>
                  {r.comment ? (
                    <p className="text-sm text-slate-600 italic leading-relaxed">"{r.comment}"</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No comment provided.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Invoice Modal */}
        {invoiceModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Generate Invoice</h3>
                <button onClick={() => setInvoiceModal({ isOpen: false, bookingId: null })} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Hours Worked</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.5"
                    value={invoiceData.hoursWorked}
                    onChange={(e) => setInvoiceData({ ...invoiceData, hoursWorked: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    placeholder="e.g. 2.5 (Enter 0 if flat rate)"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Extra Materials/Usage</label>
                    <button onClick={handleAddExtra} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <span>+</span> Add Extra
                    </button>
                  </div>
                  
                  {invoiceData.extras.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No extra costs added.</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {invoiceData.extras.map((extra, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <input 
                            type="text" 
                            value={extra.name}
                            onChange={(e) => handleExtraChange(index, "name", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. PVC Pipe"
                          />
                          <input 
                            type="number" 
                            min="0"
                            value={extra.price}
                            onChange={(e) => handleExtraChange(index, "price", e.target.value)}
                            className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="₹ Price"
                          />
                          <button onClick={() => handleRemoveExtra(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setInvoiceModal({ isOpen: false, bookingId: null })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={submitInvoice} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-200">
                  Send Invoice
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProviderDashboard;