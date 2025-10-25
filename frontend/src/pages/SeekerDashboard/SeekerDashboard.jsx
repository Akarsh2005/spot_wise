import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css'; // Import TomTom CSS
import './SeekerDashboard.css';

const SeekerDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [seeker, setSeeker] = useState(null);
  const navigate = useNavigate();
  const mapRef = useRef(null); // Ref for map instance
  const mapElementRef = useRef(null); // Ref for map container

  // TomTom API key
  const tomtomApiKey = 'yODPfBgfYdNlUs5sAcO7I61wcJtD0ff5'; // Replace with your valid key

  // Fetch seeker profile
  useEffect(() => {
    const fetchSeekerProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to access the dashboard');
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5001/api/seekers/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setSeeker(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching profile');
        navigate('/login');
      }
    };

    fetchSeekerProfile();
  }, [navigate]);

  // Geocode provider addresses and initialize map
  useEffect(() => {
    if (searchResults.length === 0 || !mapElementRef.current) return;

    // Initialize map
    const map = tt.map({
      key: tomtomApiKey,
      container: mapElementRef.current,
      center: [0, 0], // Default center, updated after geocoding
      zoom: 10,
    });

    mapRef.current = map;

    // Geocode provider addresses
    const geocodeAddresses = async () => {
      const geocodedResults = await Promise.all(
        searchResults.map(async (provider) => {
          if (!provider.address) return null;
          const addressString = `${provider.address.street}, ${provider.address.city}, ${provider.address.state}, ${provider.address.postalCode}, ${provider.address.country}`;
          try {
            const response = await axios.get(
              `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(addressString)}.json`,
              {
                params: { key: tomtomApiKey },
              }
            );
            const position = response.data.results[0]?.position;
            return position ? { ...provider, coordinates: position } : null;
          } catch (err) {
            console.error(`Geocoding error for ${provider.name}:`, err);
            return null;
          }
        })
      );

      // Filter out failed geocoding results
      const validResults = geocodedResults.filter((result) => result && result.coordinates);

      if (validResults.length > 0) {
        // Update map center to first valid coordinate
        map.setCenter([validResults[0].coordinates.lon, validResults[0].coordinates.lat]);

        // Add markers
        validResults.forEach((provider) => {
          new tt.Marker()
            .setLngLat([provider.coordinates.lon, provider.coordinates.lat])
            .setPopup(
              new tt.Popup({ offset: 35 }).setHTML(
                `<h4>${provider.name}</h4><p>${provider.serviceType}</p>`
              )
            )
            .addTo(map);
        });
      }
    };

    geocodeAddresses();

    // Clean up map on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [searchResults]);

  // Handle provider search
  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setSearchResults([]);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/providers/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: { query: searchQuery },
      });

      setSearchResults(response.data.providers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error searching providers');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('seeker');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <h2>Seeker Dashboard</h2>
        </div>
        <div className="navbar-links">
          {seeker && <span className="navbar-greeting">Welcome, {seeker.userName}</span>}
          <a href="/profile" className="navbar-link">Profile</a>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>

      {/* Search Bar */}
      <div className="dashboard-content">
        <div className="search-bar">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for providers..."
              className="search-input"
            />
            <button type="submit" className="search-button">Search</button>
          </form>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Map */}
        {searchResults.length > 0 && (
          <div id="map" ref={mapElementRef} className="map-container"></div>
        )}

        {/* Search Results */}
        <div className="search-results">
          {searchResults.length > 0 ? (
            searchResults.map((provider) => (
              <div key={provider._id} className="provider-card">
                <h4>{provider.name}</h4>
                <p>{provider.serviceType}</p>
                <p>
                  {provider.address?.city}, {provider.address?.country}
                </p>
                <button className="view-provider-button">View Details</button>
              </div>
            ))
          ) : (
            <p>No providers found. Try searching for a provider.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeekerDashboard;