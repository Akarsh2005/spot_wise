// pages/ProviderProfilePage.jsx
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
    name: "", contactNumber: "", rate: "",
    skills: [],
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
  });

  // ── Fetch profile ─────────────────────────────────
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
          rate: res.data.rate || "",
          skills: res.data.skills || [],
          address: res.data.address || { street: "", city: "", state: "", postalCode: "", country: "" },
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // ── Handle input changes ──────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("addr_")) {
      const key = name.replace("addr_", "");
      setFormData({ ...formData, address: { ...formData.address, [key]: value } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // ── Skills ────────────────────────────────────────
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !formData.skills.includes(s)) {
      setFormData({ ...formData, skills: [...formData.skills, s] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill) =>
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });

  // ── Save profile ──────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.skills.length === 0) return toast.error("Add at least one skill");
    setSaving(true);
    try {
      const res = await axios.put(
        `${API}/api/providers/profile`,
        { ...formData, rate: parseFloat(formData.rate) || 0 },
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

  // ── Update GPS location ───────────────────────────
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
          toast.success("Location updated successfully!");
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

  if (loading) return (
    <div className="page-wrapper">
      <div className="sw-spinner-wrapper" style={{ paddingTop: 100 }}><div className="sw-spinner" /></div>
    </div>
  );

  return (
    <div className="page-wrapper">

      {/* Navbar */}
      <nav className="sw-navbar">
        <div className="sw-navbar-brand">Spot<span>Wise</span></div>
        <div className="sw-nav-links">
          <span className="sw-nav-link" onClick={() => navigate("/provider/dashboard")} style={{ cursor: "pointer" }}>
            Dashboard
          </span>
          <span className="sw-nav-link active">Profile</span>
          <div className="sw-nav-user">
            <div className="sw-avatar">{profile?.name?.[0]?.toUpperCase() || "P"}</div>
            <button className="btn-outline" style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              onClick={() => { logout(); navigate("/auth"); }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container" style={{ maxWidth: 700 }}>

        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <button
            className={`btn-outline ${updatingLocation ? "opacity-50" : ""}`}
            onClick={handleUpdateLocation}
            disabled={updatingLocation}
          >
            📍 {updatingLocation ? "Updating..." : "Update Location"}
          </button>
        </div>

        {/* Profile summary */}
        {profile && (
          <div className="sw-card mb-4 d-flex align-items-center gap-3">
            <div className="provider-avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>
              {profile.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "1rem" }}>
                {profile.name}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                ⭐ {profile.rating?.toFixed(1) || "No reviews"} rating
                &nbsp;·&nbsp;
                {profile.reviews?.length || 0} review{profile.reviews?.length !== 1 ? "s" : ""}
                &nbsp;·&nbsp;
                <span className={`online-dot ${profile.status === "online" ? "online" : "offline"}`} />
                {profile.status}
              </div>
            </div>
            {profile.verified && (
              <span className="ms-auto skill-tag" style={{ background: "#D1FAE5", color: "#059669" }}>
                ✓ Verified
              </span>
            )}
          </div>
        )}

        {/* Edit form */}
        <div className="sw-card">
          <h6 className="mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
            Edit Profile
          </h6>

          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="sw-label">Full Name *</label>
                <input className="sw-input" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="sw-label">Phone Number</label>
                <input className="sw-input" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="sw-label">Hourly Rate (₹)</label>
                <input className="sw-input" type="number" name="rate" value={formData.rate} onChange={handleChange} min="0" />
              </div>

              {/* Skills */}
              <div className="col-12">
                <label className="sw-label">Skills</label>
                <div className="d-flex gap-2 mb-2">
                  <input
                    className="sw-input"
                    value={skillInput}
                    placeholder="Type a skill and press Enter or +"
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  />
                  <button type="button" className="btn-outline px-3" onClick={addSkill}>+</button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {formData.skills.map((s) => (
                    <span key={s} className="skill-tag d-flex align-items-center gap-1">
                      {s}
                      <span style={{ cursor: "pointer", marginLeft: 4 }} onClick={() => removeSkill(s)}>✕</span>
                    </span>
                  ))}
                  {formData.skills.length === 0 && (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No skills added yet</span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="col-12">
                <label className="sw-label">Address</label>
              </div>
              <div className="col-12">
                <input className="sw-input" name="addr_street" value={formData.address.street} placeholder="Street" onChange={handleChange} />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_city" value={formData.address.city} placeholder="City" onChange={handleChange} />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_state" value={formData.address.state} placeholder="State" onChange={handleChange} />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_postalCode" value={formData.address.postalCode} placeholder="Postal Code" onChange={handleChange} />
              </div>
              <div className="col-6">
                <input className="sw-input" name="addr_country" value={formData.address.country} placeholder="Country" onChange={handleChange} />
              </div>
            </div>

            <button className="btn-primary w-100 mt-4" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Reviews */}
        {profile?.reviews?.length > 0 && (
          <div className="sw-card mt-4">
            <h6 className="mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
              Reviews ({profile.reviews.length})
            </h6>
            {profile.reviews.map((r, i) => (
              <div key={i} style={{
                padding: "12px 0",
                borderBottom: i < profile.reviews.length - 1 ? "1px solid var(--border-light)" : "none"
              }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`star readonly ${s <= r.rating ? "filled" : ""}`}>★</span>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {r.review && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                    "{r.review}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProviderProfilePage;