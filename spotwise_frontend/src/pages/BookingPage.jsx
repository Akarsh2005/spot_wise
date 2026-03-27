// pages/BookingPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const BookingPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    serviceType: "",
    date: "",
    time: "",
    instructions: "",
    totalAmount: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
  });

  // ── Fetch provider details ────────────────────────
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await axios.get(`${API}/api/providers/${providerId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setProvider(res.data);
        // Pre-fill service type with first skill
        if (res.data.skills?.[0]) {
          setFormData((f) => ({ ...f, serviceType: res.data.skills[0] }));
        }
      } catch {
        toast.error("Provider not found");
        navigate("/seeker/home");
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [providerId,navigate]);

  // ── Form handlers ─────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("addr_")) {
      const key = name.replace("addr_", "");
      setFormData({ ...formData, address: { ...formData.address, [key]: value } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // ── Submit booking ────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { serviceType, date, time, address } = formData;
    if (!serviceType || !date || !time || !address.street || !address.city) {
      return toast.error("Please fill all required fields");
    }

    // Prevent past dates
    if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
      return toast.error("Please select a future date");
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/bookings`,
        {
          providerId,
          serviceType: formData.serviceType,
          date: formData.date,
          time: formData.time,
          address: formData.address,
          instructions: formData.instructions,
          totalAmount: parseFloat(formData.totalAmount) || provider?.rate || 0,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success("Booking request sent! Waiting for provider to accept.");
      navigate("/seeker/bookings");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Today's date for min date input ───────────────
  const todayStr = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="sw-spinner-wrapper" style={{ paddingTop: "100px" }}>
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
          <span className="sw-nav-link" onClick={() => navigate("/seeker/home")} style={{ cursor: "pointer" }}>
            ← Back to Home
          </span>
          <span className="sw-nav-link" onClick={() => navigate("/seeker/bookings")} style={{ cursor: "pointer" }}>
            My Bookings
          </span>
        </div>
      </nav>

      <div className="page-container" style={{ maxWidth: 800 }}>

        {/* Provider info card */}
        {provider && (
          <div className="sw-card mb-4">
            <div className="d-flex align-items-center gap-3">
              <div className="provider-avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>
                {provider.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h5 className="m-0" style={{ fontFamily: "var(--font-heading)" }}>{provider.name}</h5>
                <div className="provider-skills mt-1">
                  {provider.skills.map((s) => (
                    <span key={s} className="skill-tag">{s}</span>
                  ))}
                </div>
              </div>
              <div className="ms-auto text-end">
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-heading)" }}>
                  ₹{provider.rate}/hr
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  ⭐ {provider.rating?.toFixed(1) || "New"} rating
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking form */}
        <div className="sw-card">
          <h6 className="mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
            Book a Service
          </h6>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">

              {/* Service type */}
              <div className="col-12">
                <label className="sw-label">Service Type *</label>
                <select className="sw-select" name="serviceType" value={formData.serviceType} onChange={handleChange} required>
                  <option value="">Select service</option>
                  {provider?.skills.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="col-6">
                <label className="sw-label">Date *</label>
                <input
                  className="sw-input"
                  type="date"
                  name="date"
                  min={todayStr}
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-6">
                <label className="sw-label">Time *</label>
                <input
                  className="sw-input"
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Amount */}
              <div className="col-12">
                <label className="sw-label">Total Amount (₹)</label>
                <input
                  className="sw-input"
                  type="number"
                  name="totalAmount"
                  placeholder={`Suggested: ₹${provider?.rate || 0} (provider's rate)`}
                  value={formData.totalAmount}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              {/* Address */}
              <div className="col-12">
                <label className="sw-label">Service Address *</label>
              </div>
              <div className="col-12">
                <input className="sw-input" name="addr_street" placeholder="Street address *" onChange={handleChange} required />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_city" placeholder="City *" onChange={handleChange} required />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_state" placeholder="State" onChange={handleChange} />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_postalCode" placeholder="Postal code" onChange={handleChange} />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_country" placeholder="Country" onChange={handleChange} />
              </div>

              {/* Notes */}
              <div className="col-12">
                <label className="sw-label">Additional Instructions</label>
                <textarea
                  className="sw-textarea"
                  name="instructions"
                  placeholder="Any special instructions for the provider..."
                  value={formData.instructions}
                  onChange={handleChange}
                />
              </div>

            </div>

            {/* Actions */}
            <div className="d-flex gap-2 mt-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate("/seeker/home")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-grow-1"
                disabled={submitting}
              >
                {submitting ? "Sending request..." : "Send Booking Request"}
              </button>
            </div>

          </form>
        </div>

        {/* Info note */}
        <div className="mt-3 p-3 rounded" style={{ background: "var(--primary-light)", fontSize: "0.82rem", color: "var(--primary)" }}>
          💡 Your request will be sent to the provider. Chat opens once they accept.
        </div>

      </div>
    </div>
  );
};

export default BookingPage;