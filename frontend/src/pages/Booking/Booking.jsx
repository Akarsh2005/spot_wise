import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './Booking.css';

const Booking = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch provider details
  const fetchProvider = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5001/api/providers/${providerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProvider(res.data);
      setTotalAmount(res.data.rate); // default total amount
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching provider details');
    }
  };

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  const handleBooking = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!serviceType || !date || !time) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const bookingData = {
        providerId,
        serviceType,
        date,
        time,
        address: provider.address,
        totalAmount
      };

      const res = await axios.post('http://localhost:5001/api/bookings', bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Booking successful! Redirecting to dashboard...');
      setTimeout(() => navigate('/mybookings'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating booking');
    }
  };

  if (!provider) return <p className="loading">Loading provider details...</p>;

  return (
    <div className="booking-container">
      <h2>Book Service: {provider.name}</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="provider-info">
        <p><strong>Skills:</strong> {provider.skills.join(', ')}</p>
        <p><strong>Rate:</strong> ₹{provider.rate}/hr</p>
        <p><strong>Contact:</strong> {provider.contactNumber}</p>
        <p><strong>Address:</strong> {provider.address.street}, {provider.address.city}, {provider.address.state}, {provider.address.postalCode}, {provider.address.country}</p>
      </div>

      <form onSubmit={handleBooking} className="booking-form">
        <div className="form-group">
          <label>Service Type</label>
          <input
            type="text"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="Enter service type"
            required
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Total Amount</label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
            min={provider.rate}
          />
        </div>

        <button type="submit" className="book-button">Book Service</button>
      </form>
    </div>
  );
};

export default Booking;
