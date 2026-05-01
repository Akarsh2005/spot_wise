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
  const [searchRadius, setSearchRadius] = useState(5); // Radius in km

  const user = decodeToken();

  const QUICK_CATEGORIES = [
    { icon: "🔧", label: "Plumber" },
    { icon: "⚡", label: "Electrician" },
    { icon: "🧹", label: "Cleaning" },
    { icon: "🔨", label: "Carpenter" },
    { icon: "🎨", label: "Painter" },
    { icon: "❄️", label: "AC Repair" },
  ];

  const handleCategoryClick = (label) => {
    setSearchSkill(label);
    if (!userLocation) return toast.error("Waiting for your location...");
    fetchProviders(userLocation.latitude, userLocation.longitude, label, searchRadius);
  };

  const fetchProviders = async (lat, lng, skill, radius = 5) => {
    setLoading(true);
    try {
      const params = { latitude: lat, longitude: lng, maxDistance: radius * 1000 };
      if (skill.trim()) params.skill = skill.trim();

      const res = await axios.get(`${API}/api/providers/nearby`, {
        params,
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const list = res.data.providers || [];
      setProviders(list);

      // Map might not be ready on initial load, we handle marker sync in a separate useEffect
    } catch {
      toast.error("Failed to fetch nearby providers");
    } finally {
      setLoading(false);
    }
  };

  const initMap = (lat, lng) => {
    if (!window.tt || mapInstanceRef.current) return;

    const map = window.tt.map({
      key: TOMTOM_KEY,
      container: mapRef.current,
      center: [lng, lat],
      zoom: 13,
    });

    new window.tt.Marker({ color: "#4f46e5" }) // primary color
      .setLngLat([lng, lat])
      .setPopup(new window.tt.Popup().setHTML("<strong style='font-family:Inter,sans-serif;color:#1e293b;padding:4px;'>You are here</strong>"))
      .addTo(map);

    mapInstanceRef.current = map;
  };

  const addProviderMarkers = (providerList) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    providerList.forEach((p) => {
      if (!p.location?.coordinates) return;
      const [lng, lat] = p.location.coordinates;

      const hourlyRate = p.pricing?.hourlyRate || 0;

      const popupHTML = `
        <div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 180px;">
          <div style="font-weight: 700; font-size: 1.1rem; color: #1e293b; margin-bottom: 4px;">${p.name}</div>
          <div style="margin-bottom: 8px;">
            ${(p.skills || []).slice(0,2).map((s) => `<span style="background: #e0e7ff; color: #4f46e5; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-right: 4px; display: inline-block;">${s}</span>`).join("")}
          </div>
          <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px; font-weight: 500;">
            ⭐ ${p.rating?.toFixed(1) || "New"} &nbsp;|&nbsp; ₹${hourlyRate}/hr
          </div>
          <button
            onclick="window.navigateToBooking('${p._id}')"
            style="width: 100%; padding: 8px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;"
          >Book Now</button>
        </div>`;

      const marker = new window.tt.Marker({ color: "#f59e0b" }) // amber for providers
        .setLngLat([lng, lat])
        .setPopup(new window.tt.Popup({ offset: 30 }).setHTML(popupHTML))
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });
  };

  // Effect to sync markers whenever providers array or map instance changes
  useEffect(() => {
    if (mapInstanceRef.current && providers.length > 0) {
      addProviderMarkers(providers);
    }
  }, [providers, mapInstanceRef.current]);

  useEffect(() => {
    if (window.tt) return;
    const script = document.createElement("script");
    script.src = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js";
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ latitude, longitude });

        // Initialize map immediately (DOM is ready)
        initMap(latitude, longitude);

        fetchProviders(latitude, longitude, "", searchRadius);
      },
      () => {
        toast.error("Unable to get your location. Please allow location access.");
      }
    );
  }, []);

  useEffect(() => {
    window.navigateToBooking = (providerId) => {
      navigate(`/seeker/book/${providerId}`);
    };
    return () => {
      delete window.navigateToBooking;
    };
  }, [navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!userLocation) return toast.error("Waiting for your location...");
    fetchProviders(userLocation.latitude, userLocation.longitude, searchSkill, searchRadius);
  };

  const expandRadius = () => {
    if (!userLocation) return;
    const newRadius = searchRadius + 5;
    setSearchRadius(newRadius);
    fetchProviders(userLocation.latitude, userLocation.longitude, searchSkill, newRadius);
  };

  const reduceRadius = () => {
    if (!userLocation || searchRadius <= 5) return;
    const newRadius = searchRadius - 5;
    setSearchRadius(newRadius);
    fetchProviders(userLocation.latitude, userLocation.longitude, searchSkill, newRadius);
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="pb-12">
      {/* Navbar - Glassmorphism */}
      <nav className="glass sticky top-0 z-50 px-4 md:px-6 py-4 mx-2 md:mx-4 mt-4 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
          Spot<span className="text-slate-800">Wise</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-semibold text-indigo-600 cursor-pointer">Explore Map</span>
          <span 
            className="font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            onClick={() => navigate("/seeker/bookings")}
          >
            My Bookings
          </span>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container">
        
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Find nearby professionals</h1>
          <p className="text-slate-500 mb-6">Discover top-rated experts instantly around your location.</p>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                className="input-field h-14 text-lg shadow-sm"
                style={{ paddingLeft: '3rem' }}
                type="text"
                placeholder="Search by service... e.g. Plumber, Electrician"
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
              />
            </div>
            <button className="btn-primary px-8 h-14 text-lg" type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Quick Filter Categories */}
          <div className="flex flex-wrap gap-3 mt-4">
            {QUICK_CATEGORIES.map(cat => (
              <button 
                key={cat.label}
                onClick={() => handleCategoryClick(cat.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${searchSkill.toLowerCase() === cat.label.toLowerCase() ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
            {searchSkill && (
               <button 
                 onClick={() => handleCategoryClick("")}
                 className="flex items-center gap-1 px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
               >
                 ✕ Clear
               </button>
            )}
          </div>
        </div>

        {/* The Map */}
        <div className="glass-card overflow-hidden h-[400px] mb-10 relative">
          <div ref={mapRef} className="w-full h-full" />
          {!userLocation && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="font-semibold text-slate-600">Accessing GPS Location...</p>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {loading ? "Searching..." : `${providers.length} Provider${providers.length !== 1 ? 's' : ''} Nearby`}
          </h2>
          {userLocation && (
            <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-sm p-1">
              <button 
                onClick={reduceRadius}
                disabled={searchRadius <= 5 || loading}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Decrease Radius"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
              </button>
              
              <div className="px-3 text-sm font-bold text-slate-700 w-28 text-center flex items-center justify-center gap-1.5 border-x border-slate-100 mx-1">
                <span>📍</span>
                <span>{searchRadius} km</span>
              </div>
              
              <button 
                onClick={expandRadius}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                title="Increase Radius"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Provider Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : providers.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No providers found</h3>
            <p className="text-slate-500">
              {searchSkill ? "Try searching for a different service." : "There are currently no online providers in your area."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => (
              <div 
                key={p._id} 
                onClick={() => navigate(`/seeker/book/${p._id}`)}
                className="glass-card p-6 cursor-pointer hover:-translate-y-1 transition-transform duration-300 group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-200">
                    {p.name?.[0]?.toUpperCase() || "P"}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(p.skills || []).slice(0, 3).map((s) => (
                    <span key={s} className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
                      {s}
                    </span>
                  ))}
                  {(p.skills || []).length > 3 && (
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
                      +{(p.skills || []).length - 3}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div className="font-medium text-slate-600">
                    <span className="text-yellow-500 mr-1">⭐</span>
                    {p.rating?.toFixed(1) || "New"}
                  </div>
                  <div className="font-bold text-indigo-600 text-lg">
                    ₹{p.pricing?.hourlyRate || 0}<span className="text-sm text-slate-500 font-medium">/hr</span>
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