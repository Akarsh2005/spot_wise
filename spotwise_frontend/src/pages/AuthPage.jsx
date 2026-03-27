// pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { saveToken, getRole } from "../utils/auth";
import { connectSocket } from "../utils/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

// ── AddressFields defined OUTSIDE to prevent re-mount bug ──
const AddressFields = ({ prefix, onChange }) => (
  <div className="row g-2">
    <div className="col-12">
      <label className="sw-label">Street</label>
      <input className="sw-input" name={`${prefix}street`} placeholder="Street address" onChange={onChange} required />
    </div>
    <div className="col-6">
      <label className="sw-label">City</label>
      <input className="sw-input" name={`${prefix}city`} placeholder="City" onChange={onChange} required />
    </div>
    <div className="col-6">
      <label className="sw-label">State</label>
      <input className="sw-input" name={`${prefix}state`} placeholder="State" onChange={onChange} required />
    </div>
    <div className="col-6">
      <label className="sw-label">Postal Code</label>
      <input className="sw-input" name={`${prefix}postalCode`} placeholder="Postal code" onChange={onChange} required />
    </div>
    <div className="col-6">
      <label className="sw-label">Country</label>
      <input className="sw-input" name={`${prefix}country`} placeholder="Country" onChange={onChange} required />
    </div>
  </div>
);

// ── AuthPage ──────────────────────────────────────
const AuthPage = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");         // "login" | "register"
  const [registerRole, setRegisterRole] = useState("seeker"); // only used in register
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // Seeker register fields
  const [seekerData, setSeekerData] = useState({
    userName: "", email: "", contactNumber: "", password: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
  });

  // Provider register fields
  const [providerData, setProviderData] = useState({
    name: "", email: "", contactNumber: "", password: "",
    skills: [], rate: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
  });
  const [skillInput, setSkillInput] = useState("");

  // ── After success: save token + redirect by role ──
  const handleAuthSuccess = (token) => {
    saveToken(token);
    connectSocket(token);
    const userRole = getRole();
    toast.success("Welcome to SpotWise!");
    navigate(userRole === "provider" ? "/provider/dashboard" : "/seeker/home");
  };

  // ── LOGIN: try seeker first, then provider ────────
  // No role selection needed — JWT carries the role
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password)
      return toast.error("Please fill all fields");

    setLoading(true);
    try {
      // Try seeker login
      const res = await axios.post(`${API}/api/seekers/login`, loginData);
      handleAuthSuccess(res.data.token);
    } catch {
      // If seeker fails, try provider login
      try {
        const res = await axios.post(`${API}/api/providers/login`, loginData);
        handleAuthSuccess(res.data.token);
      } catch (err) {
        toast.error(err.response?.data?.message || "Invalid email or password");
        setLoading(false);
      }
    }
  };

  // ── Seeker register ───────────────────────────────
  const handleSeekerRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/seekers/register`, seekerData);
      handleAuthSuccess(res.data.token);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Provider register ─────────────────────────────
  const handleProviderRegister = async (e) => {
    e.preventDefault();
    if (providerData.skills.length === 0)
      return toast.error("Add at least one skill");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/providers/register`, {
        ...providerData,
        rate: parseFloat(providerData.rate) || 0,
      });
      handleAuthSuccess(res.data.token);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Change handlers ───────────────────────────────
  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });

  const handleSeekerChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("addr_")) {
      const key = name.replace("addr_", "");
      setSeekerData({ ...seekerData, address: { ...seekerData.address, [key]: value } });
    } else {
      setSeekerData({ ...seekerData, [name]: value });
    }
  };

  const handleProviderChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("addr_")) {
      const key = name.replace("addr_", "");
      setProviderData({ ...providerData, address: { ...providerData.address, [key]: value } });
    } else {
      setProviderData({ ...providerData, [name]: value });
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !providerData.skills.includes(s))
      setProviderData({ ...providerData, skills: [...providerData.skills, s] });
    setSkillInput("");
  };

  const removeSkill = (s) =>
    setProviderData({ ...providerData, skills: providerData.skills.filter((x) => x !== s) });

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">Spot<span>Wise</span></div>
        <p className="auth-subtitle">
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        {/* ══════════════════════════════════════════
            LOGIN — no role tabs
            Just email + password, role auto-detected
        ══════════════════════════════════════════ */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="sw-label">Email</label>
              <input
                className="sw-input"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={loginData.email}
                onChange={handleLoginChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="sw-label">Password</label>
              <input
                className="sw-input"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
              />
            </div>
            <button className="btn-primary w-100 mt-2" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════
            REGISTER — role tabs shown here only
        ══════════════════════════════════════════ */}
        {mode === "register" && (
          <>
            {/* Role selector tabs */}
            <div className="auth-role-tabs">
              <button
                className={`auth-role-tab ${registerRole === "seeker" ? "active" : ""}`}
                type="button"
                onClick={() => setRegisterRole("seeker")}
              >
                🔍 I'm a Seeker
              </button>
              <button
                className={`auth-role-tab ${registerRole === "provider" ? "active" : ""}`}
                type="button"
                onClick={() => setRegisterRole("provider")}
              >
                🛠 I'm a Provider
              </button>
            </div>

            {/* ── SEEKER REGISTER FORM ── */}
            {registerRole === "seeker" && (
              <form onSubmit={handleSeekerRegister}>
                <div className="row g-2">
                  <div className="col-12">
                    <label className="sw-label">Username</label>
                    <input className="sw-input" name="userName" placeholder="Your name" onChange={handleSeekerChange} required />
                  </div>
                  <div className="col-12">
                    <label className="sw-label">Email</label>
                    <input className="sw-input" type="email" name="email" placeholder="Email address" onChange={handleSeekerChange} required />
                  </div>
                  <div className="col-6">
                    <label className="sw-label">Phone</label>
                    <input className="sw-input" name="contactNumber" placeholder="10-digit number" onChange={handleSeekerChange} required />
                  </div>
                  <div className="col-6">
                    <label className="sw-label">Password</label>
                    <input className="sw-input" type="password" name="password" placeholder="Min 6 chars" onChange={handleSeekerChange} required />
                  </div>
                </div>
                <div className="sw-divider" />
                <p className="sw-label mb-2">Address</p>
                <AddressFields prefix="addr_" onChange={handleSeekerChange} />
                <button className="btn-primary w-100 mt-3" type="submit" disabled={loading}>
                  {loading ? "Creating account..." : "Create Seeker Account"}
                </button>
              </form>
            )}

            {/* ── PROVIDER REGISTER FORM ── */}
            {registerRole === "provider" && (
              <form onSubmit={handleProviderRegister}>
                <div className="row g-2">
                  <div className="col-12">
                    <label className="sw-label">Full Name</label>
                    <input className="sw-input" name="name" placeholder="Your full name" onChange={handleProviderChange} required />
                  </div>
                  <div className="col-12">
                    <label className="sw-label">Email</label>
                    <input className="sw-input" type="email" name="email" placeholder="Email address" onChange={handleProviderChange} required />
                  </div>
                  <div className="col-6">
                    <label className="sw-label">Phone</label>
                    <input className="sw-input" name="contactNumber" placeholder="10-digit number" onChange={handleProviderChange} required />
                  </div>
                  <div className="col-6">
                    <label className="sw-label">Password</label>
                    <input className="sw-input" type="password" name="password" placeholder="Min 6 chars" onChange={handleProviderChange} required />
                  </div>
                  <div className="col-6">
                    <label className="sw-label">Hourly Rate (₹)</label>
                    <input className="sw-input" type="number" name="rate" placeholder="e.g. 500" onChange={handleProviderChange} required />
                  </div>
                  <div className="col-6">
                    <label className="sw-label">Skills</label>
                    <div className="d-flex gap-1">
                      <input
                        className="sw-input"
                        value={skillInput}
                        placeholder="e.g. Plumber"
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      />
                      <button type="button" className="btn-outline px-3" onClick={addSkill}>+</button>
                    </div>
                  </div>
                  {providerData.skills.length > 0 && (
                    <div className="col-12">
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {providerData.skills.map((s) => (
                          <span key={s} className="skill-tag" style={{ cursor: "pointer" }} onClick={() => removeSkill(s)}>
                            {s} ✕
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="sw-divider" />
                <p className="sw-label mb-2">Address</p>
                <AddressFields prefix="addr_" onChange={handleProviderChange} />
                <button className="btn-primary w-100 mt-3" type="submit" disabled={loading}>
                  {loading ? "Creating account..." : "Create Provider Account"}
                </button>
              </form>
            )}
          </>
        )}

        {/* Toggle login / register */}
        <div className="auth-toggle">
          {mode === "login" ? (
            <>Don't have an account?{" "}
              <span onClick={() => setMode("register")}>Register here</span>
            </>
          ) : (
            <>Already have an account?{" "}
              <span onClick={() => setMode("login")}>Sign in</span>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default AuthPage;