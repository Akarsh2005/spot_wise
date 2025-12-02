// seeker/Booking.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./Booking.css";

const Booking = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [serviceType, setServiceType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const API_URL = "http://localhost:5001";

  // Fetch provider details
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/providers/${providerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProvider(res.data);
        setTotalAmount(res.data.rate);
      } catch (err) {
        toast.error(err.response?.data?.message || "Error fetching provider details");
      }
    };

    fetchProvider();
  }, [providerId]);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!serviceType || !date || !time || !address.street || !address.city) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const bookingData = {
        providerId,
        serviceType,
        date,
        time,
        address,
        instructions,
        totalAmount,
      };

      await axios.post(`${API_URL}/api/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Booking created successfully!");
      navigate("/mybookings");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating booking");
    } finally {
      setLoading(false);
    }
  };

  if (!provider) return <p className="loading">Loading provider details...</p>;

  return (
    <div className="booking-container">
      <h2>Book {provider.name}</h2>
      <div className="provider-info">
        <p><strong>Skills:</strong> {provider.skills?.join(", ")}</p>
        <p><strong>Rate:</strong> ₹{provider.rate}/hr</p>
        <p><strong>Contact:</strong> {provider.contactNumber}</p>
      </div>

      <form onSubmit={handleBooking} className="booking-form">
        <div className="form-group">
          <label>Service Type</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            required
          >
            <option value="">Select a service</option>
            {provider.skills?.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any special notes?"
          />
        </div>

        <div className="form-group">
          <label>Total Amount</label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            min={provider.rate}
            required
          />
        </div>

        <h4>Address</h4>
        {["street", "city", "state", "postalCode", "country"].map((field) => (
          <div className="form-group" key={field}>
            <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input
              type="text"
              name={field}
              value={address[field]}
              onChange={handleAddressChange}
              placeholder={`Enter ${field}`}
              required={["street", "city"].includes(field)}
            />
          </div>
        ))}

        <button type="submit" className="book-button" disabled={loading}>
          {loading ? "Booking..." : "Book Now"}
        </button>
      </form>
    </div>
  );
};

export default Booking;
