import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, logout } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const ProviderProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [formData, setFormData] = useState({
    name: "", contactNumber: "", serviceCharge: "", hourlyRate: "",
    skills: []
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/api/providers/profile`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setProfile(res.data);
        setFormData({
          name: res.data.name || "",
          contactNumber: res.data.contactNumber || "",
          serviceCharge: res.data.pricing?.serviceCharge || "",
          hourlyRate: res.data.pricing?.hourlyRate || "",
          skills: res.data.skills || [],
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !formData.skills.includes(s)) {
      setFormData({ ...formData, skills: [...formData.skills, s] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill) =>
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.skills.length === 0) return toast.error("Add at least one skill");
    setSaving(true);
    try {
      const res = await axios.put(
        `${API}/api/providers/profile`,
        { 
          ...formData, 
          serviceCharge: parseFloat(formData.serviceCharge) || 0,
          hourlyRate: parseFloat(formData.hourlyRate) || 0 
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setProfile(res.data.provider);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await axios.put(
            `${API}/api/providers/location`,
            { latitude: coords.latitude, longitude: coords.longitude },
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          toast.success("Location synced successfully! You are now visible on the map.");
        } catch {
          toast.error("Failed to update location");
        } finally {
          setUpdatingLocation(false);
        }
      },
      () => {
        toast.error("Unable to get location. Please allow access.");
        setUpdatingLocation(false);
      }
    );
  };

  const handleLogout = async () => {
    try {
      await axios.put(
        `${API}/api/providers/status`,
        { status: "offline" },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
    } catch (err) {
      console.error("Failed to set offline on logout", err);
    } finally {
      logout();
      navigate("/auth");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="pb-12">

      <nav className="glass sticky top-0 z-50 px-4 md:px-6 py-4 mx-2 md:mx-4 mt-4 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
          Spot<span className="text-slate-800">Wise</span> <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md ml-2">Provider</span>
        </div>
        <div className="flex items-center gap-6">
          <span 
            className="font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            onClick={() => navigate("/provider/dashboard")}
          >
            Dashboard
          </span>
          <span className="font-semibold text-indigo-600 cursor-pointer">
            Profile & Settings
          </span>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {profile?.name?.[0]?.toUpperCase() || "P"}
            </div>
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container max-w-3xl">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">My Profile</h1>
            <p className="text-slate-500">Manage your public information and pricing</p>
          </div>
          <button
            className={`btn-secondary flex items-center gap-2 ${updatingLocation ? "opacity-50" : ""}`}
            onClick={handleUpdateLocation}
            disabled={updatingLocation}
          >
            📍 {updatingLocation ? "Syncing..." : "Sync GPS Location"}
          </button>
        </div>

        {profile && (
          <div className="glass-card p-6 mb-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 border-l-4 border-l-green-500">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-4xl font-bold shadow-lg shrink-0">
              {profile.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                {profile.name}
                {profile.verified && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">✓ Verified</span>}
              </h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-2 mt-3 text-sm font-medium text-slate-500">
                <span>⭐ {profile.rating?.toFixed(1) || "New"} Rating</span>
                <span>•</span>
                <span>{profile.reviews?.length || 0} Reviews</span>
                <span>•</span>
                <span className={`flex items-center gap-1 ${profile.status === "online" ? "text-green-600" : "text-slate-400"}`}>
                  <span className={`w-2 h-2 rounded-full ${profile.status === "online" ? "bg-green-500 animate-pulse" : "bg-slate-300"}`}></span>
                  {profile.status === "online" ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Profile Details</h2>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                <input className="input-field" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Contact Number</label>
                <input className="input-field" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Service Charge (₹)</label>
                <input className="input-field" type="number" name="serviceCharge" value={formData.serviceCharge} onChange={handleChange} min="0" placeholder="Base fee" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hourly Rate (₹)</label>
                <input className="input-field" type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} min="0" placeholder="Rate per hour" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Skills *</label>
              <div className="flex gap-2 mb-3">
                <input
                  className="input-field flex-1"
                  value={skillInput}
                  placeholder="Type a skill and press Enter..."
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <button type="button" className="btn-secondary px-6" onClick={addSkill}>Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((s) => (
                  <span key={s} className="bg-indigo-50 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm border border-indigo-100">
                    {s}
                    <button type="button" className="hover:text-red-500 font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-100 transition-colors" onClick={() => removeSkill(s)}>✕</button>
                  </span>
                ))}
                {formData.skills.length === 0 && <span className="text-sm text-slate-400 italic">No skills added yet.</span>}
              </div>
            </div>

            <button className="btn-primary w-full py-3 text-lg mt-4" type="submit" disabled={saving}>
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </form>
        </div>

        {profile?.reviews?.length > 0 && (
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Client Reviews ({profile.reviews.length})</h2>
            <div className="space-y-6">
              {profile.reviews.map((r, i) => (
                <div key={i} className={`pb-6 ${i < profile.reviews.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= r.rating ? "text-yellow-400" : "text-slate-200"}>★</span>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {day: 'numeric', month: 'short', year: 'numeric'})}
                    </span>
                  </div>
                  {r.review && <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{r.review}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProviderProfilePage;