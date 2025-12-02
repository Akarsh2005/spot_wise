import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./SeekerDashboard.css";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const providerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to update map center dynamically
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const SeekerDashboard = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India center
  const API_URL = "http://localhost:5001";

  // ✅ Get user's current location
  const getUserLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          let msg = "Unable to retrieve location";
          if (error.code === error.PERMISSION_DENIED)
            msg = "Location access denied";
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });

  // ✅ Updated: Fetch nearby providers (with debug + fallback)
  const fetchNearbyProviders = async (latitude, longitude) => {
    try {
      console.log("🔄 Fetching providers for:", { latitude, longitude });

      const res = await axios.get(
        `${API_URL}/api/providers/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=50000`
      );

      console.log("✅ Providers response:", res.data);

      setProviders(res.data.providers);
      setFilteredProviders(res.data.providers);
      setMapCenter([latitude, longitude]);
    } catch (err) {
      console.error("❌ Nearby Providers Error:", err.response?.data || err.message);
      toast.error("Error fetching nearby providers");

      // Fallback to all providers
      try {
        const fallbackRes = await axios.get(`${API_URL}/api/providers`);
        console.log("🔄 Fallback providers:", fallbackRes.data);
        setProviders(fallbackRes.data);
        setFilteredProviders(fallbackRes.data);
      } catch (fallbackErr) {
        console.error("❌ Fallback also failed:", fallbackErr);
      }
    }
  };

  // ✅ Initialize on load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const location = await getUserLocation();
        setUserLocation(location);
        await fetchNearbyProviders(location.latitude, location.longitude);
      } catch (err) {
        setLocationError(err.message);
        toast.error(err.message);

        // fallback - fetch all providers
        try {
          const res = await axios.get(`${API_URL}/api/providers`);
          setProviders(res.data);
          setFilteredProviders(res.data);
        } catch {
          toast.error("Failed to load providers");
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ✅ Refresh location manually
  const refreshLocation = async () => {
    try {
      setLoading(true);
      const location = await getUserLocation();
      setUserLocation(location);
      await fetchNearbyProviders(location.latitude, location.longitude);
      toast.success("Location updated!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Search filter
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = providers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.skills?.some((skill) => skill.toLowerCase().includes(query))
    );
    setFilteredProviders(filtered);
  };

  // ✅ Start chat
  const startChat = async (providerId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to start a chat");
        navigate("/");
        return;
      }

      const res = await axios.post(
        `${API_URL}/api/chats`,
        { userId: providerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error starting chat");
    }
  };

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("seeker");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Finding providers near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo" onClick={() => navigate("/dashboard")}>
          SpotWise
        </h2>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search providers by name or skill..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-bar"
          />
          <button onClick={refreshLocation} className="refresh-btn" title="Refresh location">
            🔄
          </button>
        </div>

        <div className="nav-links">
          <button onClick={() => navigate("/profile")} className="nav-button">
            Profile
          </button>
          <button onClick={() => navigate("/mybookings")} className="nav-button">
            My Bookings
          </button>
          <button onClick={() => navigate("/chat")} className="nav-button">
            Messages
          </button>
          <button onClick={handleLogout} className="nav-button logout">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Dashboard */}
      <div className="dashboard-content">
        {/* Map Section */}
        <div className="map-section">
          <div className="map-header">
            <h3>Providers Near You</h3>
            {userLocation && (
              <div className="location-info">
                📍 {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </div>
            )}
          </div>

          <div className="map-container">
            <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapUpdater center={mapCenter} />

              {/* User Marker */}
              {userLocation && (
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  icon={userIcon}
                >
                  <Popup>
                    <strong>Your Location</strong>
                  </Popup>
                </Marker>
              )}

              {/* Provider Markers */}
              {filteredProviders.map((provider) => (
                <Marker
                  key={provider._id}
                  position={[
                    provider.location?.coordinates[1] || mapCenter[0],
                    provider.location?.coordinates[0] || mapCenter[1],
                  ]}
                  icon={providerIcon}
                >
                  <Popup>
                    <div className="provider-popup">
                      <h4>{provider.name}</h4>
                      <p>
                        <strong>Skills:</strong> {provider.skills?.join(", ")}
                      </p>
                      <p>
                        <strong>Rate:</strong> ₹{provider.rate}/hr
                      </p>
                      <p>
                        <strong>Rating:</strong> {provider.rating?.toFixed(1) || "N/A"}
                      </p>
                      <div className="popup-actions">
                        <button
                          onClick={() => navigate(`/book/${provider._id}`)}
                          className="popup-book-btn"
                        >
                          Book Now
                        </button>
                        <button
                          onClick={() => startChat(provider._id)}
                          className="popup-chat-btn"
                        >
                          Chat
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Provider List Section */}
        <div className="providers-list-section">
          <div className="section-header">
            <h3>Available Providers ({filteredProviders.length})</h3>
            <span className="radius-info">Within 50 km radius</span>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="no-providers">
              <p>No providers found near you.</p>
              {locationError && <p className="error-text">{locationError}</p>}
            </div>
          ) : (
            <div className="providers-grid">
              {filteredProviders.map((provider) => (
                <div key={provider._id} className="provider-card">
                  <div className="card-header">
                    <h4>{provider.name}</h4>
                    <span className="distance-badge">
                      {provider.distance
                        ? `${(provider.distance / 1000).toFixed(1)} km`
                        : "Nearby"}
                    </span>
                  </div>
                  <div className="card-content">
                    <p>
                      <strong>Skills:</strong> {provider.skills?.join(", ")}
                    </p>
                    <p>
                      <strong>Rate:</strong> ₹{provider.rate}/hr
                    </p>
                    <p>
                      <strong>Contact:</strong> {provider.contactNumber || "N/A"}
                    </p>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => navigate(`/book/${provider._id}`)}
                      className="book-btn"
                    >
                      Book
                    </button>
                    <button
                      onClick={() => startChat(provider._id)}
                      className="chat-btn"
                    >
                      💬 Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeekerDashboard;
