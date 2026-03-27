// pages/MyBookingsPage.jsx
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

  // ── Fetch bookings ────────────────────────────────
  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/api/bookings/seeker`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setBookings(res.data.bookings || res.data);
    } catch  {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // ── Socket: live booking status updates ───────────
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

  // ── Cancel booking ────────────────────────────────
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

  // ── Submit review ─────────────────────────────────
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
      toast.success("Review submitted!");
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

  // ── Open chat popup ───────────────────────────────
  const openChat = (providerId) => {
    // Dispatch custom event picked up by ChatPopup
    window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { userId: providerId } }));
  };

  // ── Filter bookings ───────────────────────────────
  const filtered = activeTab === "All"
    ? bookings
    : bookings.filter((b) => b.status === activeTab);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  // ── Star input component ──────────────────────────
  const StarInput = ({ bookingId }) => {
    const current = reviewState[bookingId]?.rating || 0;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={`star ${s <= current ? "filled" : ""}`}
            onClick={() => setReviewState((prev) => ({
              ...prev, [bookingId]: { ...prev[bookingId], rating: s }
            }))}
          >★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="page-wrapper">

      {/* Navbar */}
      <nav className="sw-navbar">
        <div className="sw-navbar-brand">Spot<span>Wise</span></div>
        <div className="sw-nav-links">
          <span className="sw-nav-link" onClick={() => navigate("/seeker/home")} style={{ cursor: "pointer" }}>Home</span>
          <span className="sw-nav-link active">My Bookings</span>
          <div className="sw-nav-user">
            <div className="sw-avatar">{user?.id?.[0]?.toUpperCase() || "S"}</div>
            <button className="btn-outline" style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              onClick={() => { logout(); navigate("/auth"); }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container">

        <div className="page-header">
          <h1 className="page-title">My Bookings</h1>
          <button className="btn-primary" onClick={() => navigate("/seeker/home")}>
            + New Booking
          </button>
        </div>

        {/* Tab filters */}
        <div className="tab-filter">
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab-filter-btn ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
              {t !== "All" && (
                <span className="ms-1" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  ({bookings.filter((b) => b.status === t).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        {loading ? (
          <div className="sw-spinner-wrapper"><div className="sw-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              {activeTab === "All" ? "No bookings yet. Book a service!" : `No ${activeTab.toLowerCase()} bookings.`}
            </div>
            {activeTab === "All" && (
              <button className="btn-primary mt-3" onClick={() => navigate("/seeker/home")}>
                Find Services
              </button>
            )}
          </div>
        ) : (
          filtered.map((booking) => (
            <div className="booking-card" key={booking._id}>

              {/* Header */}
              <div className="booking-card-header">
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "0.95rem" }}>
                    {booking.serviceType}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    Provider: <strong>{booking.provider?.name || "—"}</strong>
                  </div>
                </div>
                <span className={`status-badge status-${booking.status}`}>
                  {booking.status}
                </span>
              </div>

              {/* Meta info */}
              <div className="booking-card-meta">
                <span>📅 {formatDate(booking.date)}</span>
                <span>🕐 {booking.time}</span>
                <span>📍 {booking.address?.city}</span>
                {booking.totalAmount > 0 && <span>💰 ₹{booking.totalAmount}</span>}
              </div>

              {booking.instructions && (
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  📝 {booking.instructions}
                </div>
              )}

              {booking.reason && (
                <div style={{ fontSize: "0.82rem", color: "var(--status-rejected)", marginBottom: 8 }}>
                  ❌ Reason: {booking.reason}
                </div>
              )}

              {/* Actions */}
              <div className="booking-card-actions">

                {/* Cancel — only on Pending */}
                {booking.status === "Pending" && (
                  <button
                    className="btn-danger"
                    onClick={() => handleCancel(booking._id)}
                    disabled={cancelling === booking._id}
                  >
                    {cancelling === booking._id ? "Cancelling..." : "Cancel"}
                  </button>
                )}

                {/* Chat — only on Accepted / In Progress */}
                {["Accepted", "In Progress"].includes(booking.status) && booking.provider?._id && (
                  <button className="btn-chat" onClick={() => openChat(booking.provider._id)}>
                    💬 Chat with Provider
                  </button>
                )}

                {/* Review — only on Completed without existing review */}
                {booking.status === "Completed" && !booking.rating && (
                  <div style={{ width: "100%" }}>
                    <div className="sw-divider" />
                    <div style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 8 }}>
                      Leave a review
                    </div>
                    <StarInput bookingId={booking._id} />
                    <textarea
                      className="sw-textarea mt-2"
                      style={{ minHeight: 70 }}
                      placeholder="Write your experience..."
                      value={reviewState[booking._id]?.review || ""}
                      onChange={(e) =>
                        setReviewState((prev) => ({
                          ...prev,
                          [booking._id]: { ...prev[booking._id], review: e.target.value }
                        }))
                      }
                    />
                    <button
                      className="btn-primary mt-2"
                      onClick={() => handleReviewSubmit(booking._id)}
                      disabled={reviewState[booking._id]?.submitting}
                    >
                      {reviewState[booking._id]?.submitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                )}

                {/* Show existing review */}
                {booking.status === "Completed" && booking.rating && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    ⭐ You rated: {booking.rating}/5{booking.review ? ` — "${booking.review}"` : ""}
                  </div>
                )}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyBookingsPage;