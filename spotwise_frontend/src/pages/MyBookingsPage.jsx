import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, logout, decodeToken } from "../utils/auth";
import { getSocket } from "../utils/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const TABS = ["All", "Pending", "Accepted", "In Progress", "Completed", "Cancelled", "Rejected"];

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [reviewState, setReviewState] = useState({}); // bookingId → { rating, review, submitting }
  const [cancelling, setCancelling] = useState(null);

  const user = decodeToken();

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/api/bookings/seeker`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setBookings(res.data.bookings || res.data);
    } catch {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onUpdate = ({ bookingId, status, reason }) => {
      setBookings((prev) =>
        prev.map((b) => b._id === bookingId ? { ...b, status, reason } : b)
      );
      const msg = status === "Accepted"
        ? "Your booking was accepted! Chat is now open."
        : status === "Rejected"
        ? `Booking rejected. ${reason ? `Reason: ${reason}` : ""}`
        : `Booking status updated to ${status}`;
      toast.info(msg);
    };

    socket.on("booking_update", onUpdate);
    return () => socket.off("booking_update", onUpdate);
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(bookingId);
    try {
      await axios.put(
        `${API}/api/bookings/seeker/cancel/${bookingId}`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setBookings((prev) =>
        prev.map((b) => b._id === bookingId ? { ...b, status: "Cancelled" } : b)
      );
      toast.success("Booking cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  };

  const handleReviewSubmit = async (bookingId) => {
    const r = reviewState[bookingId];
    if (!r?.rating) return toast.error("Please select a star rating");

    setReviewState((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], submitting: true } }));
    try {
      await axios.put(
        `${API}/api/bookings/review/${bookingId}`,
        { rating: r.rating, review: r.review || "" },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success("Review submitted! Thank you.");
      setBookings((prev) =>
        prev.map((b) => b._id === bookingId ? { ...b, rating: r.rating, review: r.review } : b)
      );
      setReviewState((prev) => ({ ...prev, [bookingId]: undefined }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewState((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], submitting: false } }));
    }
  };

  const openChat = (providerId) => {
    window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { userId: providerId } }));
  };

  const filtered = activeTab === "All" ? bookings : bookings.filter((b) => b.status === activeTab);
  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Accepted': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Cancelled': 
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const StarInput = ({ bookingId }) => {
    const current = reviewState[bookingId]?.rating || 0;
    return (
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            className={`text-2xl focus:outline-none transition-transform hover:scale-110 ${s <= current ? "text-yellow-400 drop-shadow-md" : "text-slate-200"}`}
            onClick={() => setReviewState((prev) => ({
              ...prev, [bookingId]: { ...prev[bookingId], rating: s }
            }))}
          >★</button>
        ))}
      </div>
    );
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
      <nav className="glass sticky top-0 z-50 px-6 py-4 mx-4 mt-4 mb-8 flex justify-between items-center">
        <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
          Spot<span className="text-slate-800">Wise</span>
        </div>
        <div className="flex items-center gap-6">
          <span 
            className="font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            onClick={() => navigate("/seeker/home")}
          >
            Explore Map
          </span>
          <span className="font-semibold text-indigo-600 cursor-pointer">
            My Bookings
          </span>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {user?.id?.[0]?.toUpperCase() || "S"}
            </div>
            <button onClick={() => { logout(); navigate("/auth"); }} className="text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container max-w-5xl">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">My Bookings</h1>
            <p className="text-slate-500">Track and manage your service requests</p>
          </div>
          <button onClick={() => navigate("/seeker/home")} className="btn-primary">
            + New Booking
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white/50 p-2 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-600 hover:bg-white hover:shadow-sm"}`}
            >
              {t} {t !== "All" && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === t ? "bg-white/20" : "bg-slate-200 text-slate-500"}`}>{bookings.filter((b) => b.status === t).length}</span>}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center border-dashed border-2">
            <div className="text-5xl mb-4 opacity-50">📋</div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No bookings found</h3>
            <p className="text-slate-500 mb-6">
              {activeTab === "All" ? "You haven't requested any services yet." : `You have no ${activeTab.toLowerCase()} bookings.`}
            </p>
            {activeTab === "All" && (
              <button className="btn-secondary" onClick={() => navigate("/seeker/home")}>Find Services</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((booking) => (
              <div key={booking._id} className="glass-card p-6 flex flex-col hover:shadow-lg transition-shadow border-t-4 border-transparent hover:border-indigo-500">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">{booking.serviceType}</h3>
                    <p className="text-sm text-slate-500 mt-1">Provider: <span className="font-semibold text-indigo-600">{booking.provider?.name || "—"}</span></p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-3 mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1"><span className="text-slate-400">📅</span> {formatDate(booking.date)}</div>
                  <div className="flex items-center gap-1"><span className="text-slate-400">⏰</span> {booking.time}</div>
                  {booking.status === "Completed" && booking.totalCost > 0 && (
                    <div className="flex items-center gap-1 font-bold text-slate-800"><span className="text-slate-400">💰</span> ₹{booking.totalCost}</div>
                  )}
                </div>

                {booking.reason && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 mb-4 flex items-start gap-2">
                    <span>❌</span> <div><strong>Reason:</strong> {booking.reason}</div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100">
                  {/* Cancel Button */}
                  {booking.status === "Pending" && (
                    <button
                      className="w-full btn-danger"
                      onClick={() => handleCancel(booking._id)}
                      disabled={cancelling === booking._id}
                    >
                      {cancelling === booking._id ? "Cancelling..." : "Cancel Request"}
                    </button>
                  )}

                  {/* Chat Button */}
                  {["Accepted", "In Progress"].includes(booking.status) && booking.provider?._id && (
                    <button 
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      onClick={() => openChat(booking.provider._id)}
                    >
                      💬 Open Chat
                    </button>
                  )}

                  {/* Rating / Review Section */}
                  {booking.status === "Completed" && !booking.rating && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-sm font-semibold text-slate-700 mb-2">How was the service?</p>
                      <StarInput bookingId={booking._id} />
                      <textarea
                        className="input-field mt-2 text-sm w-full bg-white border-indigo-100"
                        rows={2}
                        placeholder="Write a brief review..."
                        value={reviewState[booking._id]?.review || ""}
                        onChange={(e) =>
                          setReviewState((prev) => ({
                            ...prev,
                            [booking._id]: { ...prev[booking._id], review: e.target.value }
                          }))
                        }
                      />
                      <button
                        className="w-full btn-primary mt-3 py-2 text-sm"
                        onClick={() => handleReviewSubmit(booking._id)}
                        disabled={reviewState[booking._id]?.submitting}
                      >
                        {reviewState[booking._id]?.submitting ? "Submitting..." : "Submit Review"}
                      </button>
                    </div>
                  )}

                  {/* Submitted Review Display */}
                  {booking.status === "Completed" && booking.rating && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(s => <span key={s} className={s <= booking.rating ? "text-yellow-400" : "text-slate-300"}>★</span>)}
                      </div>
                      {booking.review && <p className="text-sm text-slate-600 italic">"{booking.review}"</p>}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookingsPage;