// pages/SeekerHomePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, logout, decodeToken } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY || "";

const SeekerHomePage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchSkill, setSearchSkill] = useState("");
  const [userLocation, setUserLocation] = useState(null);

  const user = decodeToken();

  // ── Fetch nearby providers ────────────────────────
  const fetchProviders = async (lat, lng, skill) => {
    setLoading(true);
    try {
      const params = { latitude: lat, longitude: lng, maxDistance: 5000 };
      if (skill.trim()) params.skill = skill.trim();

      const res = await axios.get(`${API}/api/providers/nearby`, {
        params,
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const list = res.data.providers || [];
      setProviders(list);

      if (mapInstanceRef.current) {
        addProviderMarkers(list);
      }
    } catch {
      toast.error("Failed to fetch nearby providers");
    } finally {
      setLoading(false);
    }
  };

  // ── Init TomTom map ───────────────────────────────
  const initMap = (lat, lng) => {
    if (!window.tt || mapInstanceRef.current) return;

    const map = window.tt.map({
      key: TOMTOM_KEY,
      container: mapRef.current,
      center: [lng, lat],
      zoom: 13,
    });

    // Blue marker for seeker's own location
    new window.tt.Marker({ color: "#2563eb" })
      .setLngLat([lng, lat])
      .setPopup(new window.tt.Popup().setHTML("<strong>You are here</strong>"))
      .addTo(map);

    mapInstanceRef.current = map;
  };

  // ── Add provider pins on map ──────────────────────
  const addProviderMarkers = (providerList) => {
    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    providerList.forEach((p) => {
      if (!p.location?.coordinates) return;
      const [lng, lat] = p.location.coordinates;

      const popupHTML = `
        <div class="map-popup">
          <div class="map-popup-name">${p.name}</div>
          <div style="margin-bottom:6px;">
            ${p.skills.map((s) => `<span class="skill-tag">${s}</span>`).join(" ")}
          </div>
          <div style="font-size:0.82rem;color:#475569;margin-bottom:10px;">
            ⭐ ${p.rating?.toFixed(1) || "New"} &nbsp;|&nbsp; ₹${p.rate}/hr
          </div>
          <button
            onclick="window.navigateToBooking('${p._id}')"
            style="width:100%;padding:8px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:500;"
          >Book Now</button>
        </div>`;

      const marker = new window.tt.Marker({ color: "#f59e0b" })
        .setLngLat([lng, lat])
        .setPopup(new window.tt.Popup({ offset: 30 }).setHTML(popupHTML))
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });
  };

  // ── Load TomTom SDK script once ───────────────────
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

  // ── Get GPS on mount ──────────────────────────────
  // Empty dep array [] — runs once only, no circular deps
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ latitude, longitude });

        // Update seeker location on backend (best effort)
        try {
          await axios.put(
            `${API}/api/seekers/location`,
            { latitude, longitude },
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
        } catch {
          // ignore — not critical if this fails
        }

        // Wait a moment for TomTom SDK to load then init map
        setTimeout(() => {
          initMap(latitude, longitude);
        }, 800);

        // Fetch providers right away
        fetchProviders(latitude, longitude, "");
      },
      () => {
        toast.error("Unable to get your location. Please allow location access.");
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Global function called by map popup button ────
  useEffect(() => {
    window.navigateToBooking = (providerId) => {
      navigate(`/seeker/book/${providerId}`);
    };
    return () => {
      delete window.navigateToBooking;
    };
  }, [navigate]);

  // ── Search submit ─────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (!userLocation) return toast.error("Waiting for your location...");
    fetchProviders(userLocation.latitude, userLocation.longitude, searchSkill);
  };

  // ── Logout ────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="page-wrapper">

      {/* Navbar */}
      <nav className="sw-navbar">
        <div className="sw-navbar-brand">Spot<span>Wise</span></div>
        <div className="sw-nav-links">
          <span className="sw-nav-link active">Home</span>
          <span
            className="sw-nav-link"
            onClick={() => navigate("/seeker/bookings")}
            style={{ cursor: "pointer" }}
          >
            My Bookings
          </span>
          <div className="sw-nav-user">
            <div className="sw-avatar">
              {user?.id?.[0]?.toUpperCase() || "S"}
            </div>
            <button
              className="btn-outline"
              style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="page-container">

        {/* Search bar */}
        <div className="mb-3">
          <form onSubmit={handleSearch} className="d-flex gap-2">
            <div className="search-bar-wrapper flex-grow-1">
              <span className="search-bar-icon">🔍</span>
              <input
                className="search-bar"
                type="text"
                placeholder="Search by service... e.g. Plumber, Electrician, Cleaner"
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
              />
            </div>
            <button
              className="btn-primary px-4"
              type="submit"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>

        {/* Map */}
        <div
          className="map-container mb-3"
          ref={mapRef}
          id="tomtom-map"
        >
          {!userLocation && (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center text-muted">
                <div className="sw-spinner mx-auto mb-2" />
                <p style={{ fontSize: "0.875rem" }}>Getting your location...</p>
              </div>
            </div>
          )}
        </div>

        {/* Results header */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6
            className="m-0"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
          >
            {loading
              ? "Searching..."
              : `${providers.length} provider${providers.length !== 1 ? "s" : ""} found nearby`}
          </h6>
          {userLocation && (
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              📍 Within 5km of your location
            </span>
          )}
        </div>

        {/* Provider list */}
        {loading ? (
          <div className="sw-spinner-wrapper">
            <div className="sw-spinner" />
          </div>
        ) : providers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">
              No providers found nearby.{" "}
              {searchSkill
                ? "Try a different service."
                : "Make sure your location is enabled."}
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {providers.map((p) => (
              <div className="col-md-6 col-lg-4" key={p._id}>
                <div
                  className="provider-card h-100"
                  onClick={() => navigate(`/seeker/book/${p._id}`)}
                >
                  <div className="provider-avatar">
                    {p.name?.[0]?.toUpperCase() || "P"}
                  </div>
                  <div className="provider-info">
                    <div className="provider-name">{p.name}</div>
                    <div className="provider-skills">
                      {p.skills.slice(0, 3).map((s) => (
                        <span key={s} className="skill-tag">{s}</span>
                      ))}
                      {p.skills.length > 3 && (
                        <span className="skill-tag">+{p.skills.length - 3}</span>
                      )}
                    </div>
                    <div className="provider-rate">
                      ⭐ {p.rating?.toFixed(1) || "New"} &nbsp;|&nbsp;
                      <strong>₹{p.rate}/hr</strong>
                    </div>
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <span className="online-dot online" />
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default SeekerHomePage;