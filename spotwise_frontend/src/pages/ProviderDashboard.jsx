// pages/ProviderDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, logout, decodeToken } from "../utils/auth";
import { getSocket } from "../utils/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY || "";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const [isOnline, setIsOnline] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    totalEarnings: 0,
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const user = decodeToken();

  // ── Init TomTom map (plain function, not useCallback) ─
  const initMap = (lat, lng, pending) => {
    if (!window.tt || mapInstanceRef.current) return;

    const map = window.tt.map({
      key: TOMTOM_KEY,
      container: mapRef.current,
      center: [lng, lat],
      zoom: 12,
    });

    new window.tt.Marker({ color: "#2563eb" })
      .setLngLat([lng, lat])
      .setPopup(new window.tt.Popup().setHTML("<strong>Your location</strong>"))
      .addTo(map);

    mapInstanceRef.current = map;

    // Add pins for all pending bookings
    if (pending && pending.length > 0) {
      pending.forEach((b) => addBookingPin(b, map));
    }
  };

  // ── Add a request pin on map ──────────────────────
  const addBookingPin = (booking, mapInst) => {
    const map = mapInst || mapInstanceRef.current;
    if (!map || !booking.address) return;

    const addressStr = `${booking.address.street}, ${booking.address.city}`;

    fetch(
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(addressStr)}.json?key=${TOMTOM_KEY}`
    )
      .then((r) => r.json())
      .then((data) => {
        const pos = data.results?.[0]?.position;
        if (!pos) return;

        const marker = new window.tt.Marker({ color: "#ef4444" })
          .setLngLat([pos.lon, pos.lat])
          .addTo(map);

        marker.getElement().addEventListener("click", () => {
          setSelectedBooking(booking);
        });

        markersRef.current[booking._id] = marker;
      })
      .catch(() => {});
  };

  // ── Remove a pin from map ─────────────────────────
  const removeBookingPin = (bookingId) => {
    if (markersRef.current[bookingId]) {
      markersRef.current[bookingId].remove();
      delete markersRef.current[bookingId];
    }
  };

  // ── Load TomTom SDK ───────────────────────────────
  useEffect(() => {
    if (window.tt) return;
    const script = document.createElement("script");
    script.src =
      "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js";
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css";
    document.head.appendChild(link);
  }, []);

  // ── Fetch all dashboard data on mount ─────────────
  // Empty dep array [] — runs once only, no circular deps
  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, bookingsRes, profileRes] = await Promise.all([
          axios.get(`${API}/api/providers/dashboard`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          axios.get(`${API}/api/bookings/provider`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          axios.get(`${API}/api/providers/profile`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
        ]);

        setStats({
          totalBookings: dashRes.data.totalBookings,
          completedBookings: dashRes.data.completedBookings,
          pendingBookings: dashRes.data.pendingBookings,
          totalEarnings: dashRes.data.totalEarnings,
        });

        const allBookings = bookingsRes.data.bookings || bookingsRes.data;
        const pending = allBookings.filter((b) => b.status === "Pending");
        const accepted = allBookings.filter((b) =>
          ["Accepted", "In Progress"].includes(b.status)
        );

        setPendingBookings(pending);
        setAcceptedBookings(accepted);
        setIsOnline(profileRes.data.status === "online");

        // Wait for TomTom SDK to load, then init map
        const loc = profileRes.data.location?.coordinates;
        const lat = loc?.[1] || 13.0827;
        const lng = loc?.[0] || 80.2707;

        setTimeout(() => {
          initMap(lat, lng, pending);
        }, 800);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket: live new booking pin ──────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewBooking = (data) => {
      toast.info("New booking request!");
      axios
        .get(`${API}/api/bookings/provider`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        .then((res) => {
          const all = res.data.bookings || res.data;
          const newPending = all.filter((b) => b.status === "Pending");
          setPendingBookings(newPending);
          const newBooking = all.find((b) => b._id === data.bookingId);
          if (newBooking) addBookingPin(newBooking);
        })
        .catch(() => {});
    };

    socket.on("new-booking", onNewBooking);
    return () => socket.off("new-booking", onNewBooking);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Online / Offline toggle ───────────────────────
  const toggleOnline = async (checked) => {
    const newStatus = checked ? "online" : "offline";
    try {
      await axios.put(
        `${API}/api/providers/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setIsOnline(checked);
      toast.success(`You are now ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // ── Accept / Reject a pending booking ────────────
  const handleBookingAction = async (bookingId, status, reason = "") => {
    setActionLoading(bookingId + status);
    try {
      await axios.put(
        `${API}/api/bookings/provider/${bookingId}`,
        { status, reason },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      removeBookingPin(bookingId);
      setSelectedBooking(null);
      setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));

      if (status === "Accepted") {
        const found = pendingBookings.find((b) => b._id === bookingId);
        if (found)
          setAcceptedBookings((prev) => [...prev, { ...found, status: "Accepted" }]);
        toast.success("Booking accepted! Chat is now open.");
      } else {
        toast.info("Booking rejected");
      }

      setStats((s) => ({ ...s, pendingBookings: Math.max(0, s.pendingBookings - 1) }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Update status of an accepted booking ──────────
  const updateStatus = async (bookingId, status, paymentStatus) => {
    setActionLoading(bookingId + status);
    try {
      await axios.put(
        `${API}/api/bookings/provider/${bookingId}`,
        { status, paymentStatus },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setAcceptedBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status, paymentStatus: paymentStatus || b.paymentStatus }
            : b
        )
      );

      if (status === "Completed") {
        const earning =
          acceptedBookings.find((b) => b._id === bookingId)?.totalAmount || 0;
        setStats((s) => ({
          ...s,
          completedBookings: s.completedBookings + 1,
          totalEarnings: s.totalEarnings + earning,
        }));
      }

      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Open chat with seeker ─────────────────────────
  const openChat = (seekerId) => {
    window.dispatchEvent(
      new CustomEvent("open-chat-with", { detail: { userId: seekerId } })
    );
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // ── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="sw-spinner-wrapper" style={{ paddingTop: 100 }}>
          <div className="sw-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">

      {/* Navbar */}
      <nav className="sw-navbar">
        <div className="sw-navbar-brand">Spot<span>Wise</span></div>
        <div className="sw-nav-links">
          <span className="sw-nav-link active">Dashboard</span>
          <span
            className="sw-nav-link"
            onClick={() => navigate("/provider/profile")}
            style={{ cursor: "pointer" }}
          >
            Profile
          </span>
          <div className="sw-nav-user">
            <div className="sw-avatar">{user?.id?.[0]?.toUpperCase() || "P"}</div>
            <button
              className="btn-outline"
              style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              onClick={() => { logout(); navigate("/auth"); }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container">

        {/* Header + Online toggle */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <h1 className="page-title mb-0">Dashboard</h1>
          <div className="online-toggle-wrapper">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => toggleOnline(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <span className="toggle-label">
              <span className={`online-dot ${isOnline ? "online" : "offline"}`} />
              {isOnline ? "Online — accepting requests" : "Offline"}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total Bookings",  value: stats.totalBookings,      icon: "📋", bg: "#EFF6FF" },
            { label: "Completed",       value: stats.completedBookings,  icon: "✅", bg: "#D1FAE5" },
            { label: "Pending",         value: stats.pendingBookings,    icon: "⏳", bg: "#FEF3C7" },
            { label: "Total Earnings",  value: `₹${stats.totalEarnings}`,icon: "💰", bg: "#F0FDF4" },
          ].map((s) => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Requests Map */}
        <div className="sw-card mb-4">
          <div className="sw-card-header">
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
              🗺 Live Requests Map
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {pendingBookings.length} pending request
              {pendingBookings.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ position: "relative" }}>
            <div className="map-container" ref={mapRef} id="provider-map" />

            {/* Booking popup — shown when a pin is clicked */}
            {selectedBooking && (
              <div
                style={{
                  position: "absolute", top: 12, right: 12, zIndex: 10,
                  background: "white", borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-lg)", padding: "16px",
                  minWidth: 260, border: "1px solid var(--border)",
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
                    New Request
                  </div>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}
                    onClick={() => setSelectedBooking(null)}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                  <strong>Seeker:</strong> {selectedBooking.seeker?.userName || "—"}
                </div>
                <div style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                  <strong>Service:</strong> {selectedBooking.serviceType}
                </div>
                <div style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                  <strong>Date:</strong> {formatDate(selectedBooking.date)} at {selectedBooking.time}
                </div>
                <div style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                  <strong>Address:</strong> {selectedBooking.address?.street},{" "}
                  {selectedBooking.address?.city}
                </div>
                {selectedBooking.totalAmount > 0 && (
                  <div style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                    <strong>Amount:</strong> ₹{selectedBooking.totalAmount}
                  </div>
                )}
                {selectedBooking.instructions && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    📝 {selectedBooking.instructions}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    className="btn-success flex-grow-1"
                    onClick={() => handleBookingAction(selectedBooking._id, "Accepted")}
                    disabled={actionLoading === selectedBooking._id + "Accepted"}
                  >
                    {actionLoading === selectedBooking._id + "Accepted" ? "..." : "✓ Accept"}
                  </button>
                  <button
                    className="btn-danger flex-grow-1"
                    onClick={() => {
                      const reason = window.prompt("Reason for rejection (optional):");
                      handleBookingAction(selectedBooking._id, "Rejected", reason || "");
                    }}
                    disabled={actionLoading === selectedBooking._id + "Rejected"}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {pendingBookings.length === 0 && (
            <div className="empty-state" style={{ padding: "20px" }}>
              <div className="empty-state-icon">📍</div>
              <div className="empty-state-text">No pending requests right now</div>
            </div>
          )}
        </div>

        {/* Accepted Bookings list */}
        <div className="sw-card">
          <div className="sw-card-header">
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
              Accepted Bookings
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {acceptedBookings.length} active
            </span>
          </div>

          {acceptedBookings.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px" }}>
              <div className="empty-state-text">No accepted bookings yet</div>
            </div>
          ) : (
            acceptedBookings.map((b) => (
              <div key={b._id} className="booking-card" style={{ marginBottom: 10 }}>

                <div className="booking-card-header">
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "0.95rem" }}>
                      {b.serviceType}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      Seeker: <strong>{b.seeker?.userName || "—"}</strong>
                      {b.seeker?.contactNumber && ` · ${b.seeker.contactNumber}`}
                    </div>
                  </div>
                  <span className={`status-badge status-${b.status.replace(" ", "\\ ")}`}>
                    {b.status}
                  </span>
                </div>

                <div className="booking-card-meta">
                  <span>📅 {formatDate(b.date)}</span>
                  <span>🕐 {b.time}</span>
                  <span>📍 {b.address?.city}</span>
                  {b.totalAmount > 0 && <span>💰 ₹{b.totalAmount}</span>}
                </div>

                <div className="booking-card-actions">

                  {/* Chat button */}
                  {b.seeker?._id && (
                    <button
                      className="btn-chat"
                      onClick={() => openChat(b.seeker._id)}
                    >
                      💬 Chat
                    </button>
                  )}

                  {/* Start */}
                  {b.status === "Accepted" && (
                    <button
                      className="btn-warning"
                      onClick={() => updateStatus(b._id, "In Progress")}
                      disabled={actionLoading === b._id + "In Progress"}
                    >
                      {actionLoading === b._id + "In Progress" ? "..." : "▶ Start"}
                    </button>
                  )}

                  {/* Complete */}
                  {b.status === "In Progress" && (
                    <button
                      className="btn-success"
                      onClick={() => updateStatus(b._id, "Completed")}
                      disabled={actionLoading === b._id + "Completed"}
                    >
                      {actionLoading === b._id + "Completed" ? "..." : "✓ Complete"}
                    </button>
                  )}

                  {/* Mark Paid */}
                  {b.status === "Completed" && b.paymentStatus !== "Paid" && (
                    <button
                      className="btn-secondary"
                      onClick={() => updateStatus(b._id, "Completed", "Paid")}
                      disabled={actionLoading === b._id + "Completed"}
                    >
                      Mark Paid
                    </button>
                  )}

                  {/* Paid badge */}
                  {b.paymentStatus === "Paid" && (
                    <span style={{ fontSize: "0.8rem", color: "var(--status-completed)", fontWeight: 500 }}>
                      ✅ Paid
                    </span>
                  )}

                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default ProviderDashboard;