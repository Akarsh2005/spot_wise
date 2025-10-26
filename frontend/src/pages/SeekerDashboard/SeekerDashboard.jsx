import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './SeekerDashboard.css';

const SeekerDashboard = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProviders, setFilteredProviders] = useState([]);

  // Fetch providers from backend
  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviders(response.data);
      setFilteredProviders(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching providers');
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('seeker');
    navigate('/');
  };

  // Search handler
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = providers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.skills?.some(skill => skill.toLowerCase().includes(query))
    );
    setFilteredProviders(filtered);
  };

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo" onClick={() => navigate('/dashboard')}>SpotWise</h2>
        <input
          type="text"
          placeholder="Search providers by name or skill..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-bar"
        />
        <div className="nav-links">
          <button onClick={() => navigate('/profile')} className="nav-button">Profile</button>
          <button onClick={() => navigate('/mybookings')} className="nav-button">My Bookings</button>
          <button onClick={handleLogout} className="nav-button logout">Logout</button>
        </div>
      </nav>

      {/* Provider List */}
      <div className="provider-list">
        {filteredProviders.length === 0 ? (
          <p className="no-providers">No providers found.</p>
        ) : (
          filteredProviders.map(provider => (
            <div key={provider._id} className="provider-card">
              <h3>{provider.name}</h3>
              <p><strong>Skills:</strong> {provider.skills.join(', ')}</p>
              <p><strong>Rate:</strong> ₹{provider.rate}/hr</p>
              <p><strong>Rating:</strong> {provider.rating?.toFixed(1) || 'N/A'}</p>
              <p><strong>Contact:</strong> {provider.contactNumber}</p>
              <button 
                onClick={() => navigate(`/book/${provider._id}`)} 
                className="book-button"
              >
                Book Service
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SeekerDashboard;