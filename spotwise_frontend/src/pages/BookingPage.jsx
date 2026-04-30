import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, decodeToken } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const BookingPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const user = decodeToken();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    serviceType: "",
    date: "",
    time: "",
  });

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await axios.get(`${API}/api/providers/${providerId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setProvider(res.data);
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
  }, [providerId, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { serviceType, date, time } = formData;
    if (!serviceType || !date || !time) return toast.error("Please fill all fields");

    if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
      return toast.error("Please select a valid future date");
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/bookings`,
        { providerId, serviceType, date, time },
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

  const todayStr = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 mx-4 mt-4 mb-8 flex justify-between items-center">
        <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
          Spot<span className="text-slate-800">Wise</span>
        </div>
        <div className="flex items-center gap-6">
          <span 
            className="font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            onClick={() => navigate("/seeker/home")}
          >
            ← Back to Map
          </span>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {user?.id?.[0]?.toUpperCase() || "S"}
            </div>
          </div>
        </div>
      </nav>

      <div className="page-container max-w-2xl">
        
        {/* Provider Profile Snippet */}
        {provider && (
          <div className="glass-card p-6 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 border-l-4 border-l-indigo-500">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-4xl font-bold shadow-lg shrink-0">
              {provider.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">{provider.name}</h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                {provider.skills.map((s) => (
                  <span key={s} className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-center md:text-right shrink-0 bg-white/50 p-4 rounded-xl border border-slate-100">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Base Rate</div>
              <div className="text-2xl font-bold text-indigo-600 mb-1">₹{provider.pricing?.hourlyRate || 0}<span className="text-base text-slate-500 font-medium">/hr</span></div>
              <div className="text-sm font-medium text-slate-600">
                <span className="text-yellow-500 mr-1">⭐</span>{provider.rating?.toFixed(1) || "New"}
              </div>
            </div>
          </div>
        )}

        {/* Booking Form */}
        <div className="glass-card p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h1 className="text-2xl font-bold text-slate-800">Request Service</h1>
            <p className="text-slate-500">Fill out the details below to send a request.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">What do you need? *</label>
              <div className="relative">
                <select className="input-field appearance-none" name="serviceType" value={formData.serviceType} onChange={handleChange} required>
                  <option value="" disabled>Select a service</option>
                  {provider?.skills.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  ▼
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date *</label>
                <input
                  className="input-field"
                  type="date"
                  name="date"
                  min={todayStr}
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Time *</label>
                <input
                  className="input-field"
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-4">
              <button
                type="button"
                className="btn-secondary w-1/3"
                onClick={() => navigate("/seeker/home")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? "Sending Request..." : "Send Request Now"}
              </button>
            </div>
          </form>
        </div>

        {/* Informational Toast/Banner */}
        <div className="mt-6 glass px-6 py-4 rounded-xl flex items-start gap-4">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">What happens next?</h4>
            <p className="text-slate-600 text-sm mt-1">
              Your request will be sent to the provider instantly. Once they accept, a private chat room will automatically unlock for you to discuss further details!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingPage;