import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { saveToken, getRole } from "../utils/auth";
import { connectSocket } from "../utils/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const AuthPage = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");         // "login" | "register"
  const [registerRole, setRegisterRole] = useState("seeker");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // Seeker register fields
  const [seekerData, setSeekerData] = useState({
    userName: "", email: "", contactNumber: "", password: ""
  });

  // Provider register fields
  const [providerData, setProviderData] = useState({
    name: "", email: "", contactNumber: "", password: "",
    skills: [], serviceCharge: "", hourlyRate: ""
  });
  const [skillInput, setSkillInput] = useState("");

  const handleAuthSuccess = (token) => {
    saveToken(token);
    connectSocket(token);
    const userRole = getRole();
    toast.success("Welcome to SpotWise!");
    navigate(userRole === "provider" ? "/provider/dashboard" : "/seeker/home");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/seekers/login`, loginData);
      handleAuthSuccess(res.data.token);
    } catch {
      try {
        const res = await axios.post(`${API}/api/providers/login`, loginData);
        handleAuthSuccess(res.data.token);
      } catch (err) {
        toast.error(err.response?.data?.message || "Invalid email or password");
        setLoading(false);
      }
    }
  };

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

  const handleProviderRegister = async (e) => {
    e.preventDefault();
    if (providerData.skills.length === 0) return toast.error("Add at least one skill");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/providers/register`, {
        ...providerData,
        serviceCharge: parseFloat(providerData.serviceCharge) || 0,
        hourlyRate: parseFloat(providerData.hourlyRate) || 0,
      });
      handleAuthSuccess(res.data.token);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleSeekerChange = (e) => setSeekerData({ ...seekerData, [e.target.name]: e.target.value });
  const handleProviderChange = (e) => setProviderData({ ...providerData, [e.target.name]: e.target.value });

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !providerData.skills.includes(s))
      setProviderData({ ...providerData, skills: [...providerData.skills, s] });
    setSkillInput("");
  };

  const removeSkill = (s) => setProviderData({ ...providerData, skills: providerData.skills.filter((x) => x !== s) });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">


        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600 mb-2">SpotWise</h1>
            <p className="text-slate-500 font-medium">
              {mode === "login" ? "Welcome back!" : "Join our community today"}
            </p>
          </div>

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input className="input-field" type="email" name="email" value={loginData.email} onChange={handleLoginChange} required placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input className="input-field" type="password" name="password" value={loginData.password} onChange={handleLoginChange} required placeholder="••••••••" />
              </div>
              <button className="btn-primary w-full mt-6" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {mode === "register" && (
            <div className="space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${registerRole === "seeker" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setRegisterRole("seeker")}
                >
                  I'm a Seeker
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${registerRole === "provider" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setRegisterRole("provider")}
                >
                  I'm a Provider
                </button>
              </div>

              {registerRole === "seeker" && (
                <form onSubmit={handleSeekerRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input className="input-field" name="userName" onChange={handleSeekerChange} required placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input className="input-field" type="email" name="email" onChange={handleSeekerChange} required placeholder="john@example.com" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                      <input className="input-field" name="contactNumber" onChange={handleSeekerChange} required placeholder="10-digit number" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                      <input className="input-field" type="password" name="password" onChange={handleSeekerChange} required placeholder="Min 6 chars" />
                    </div>
                  </div>
                  <button className="btn-primary w-full mt-4" type="submit" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>
                </form>
              )}

              {registerRole === "provider" && (
                <form onSubmit={handleProviderRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input className="input-field" name="name" onChange={handleProviderChange} required placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input className="input-field" type="email" name="email" onChange={handleProviderChange} required placeholder="jane@example.com" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                      <input className="input-field" name="contactNumber" onChange={handleProviderChange} required placeholder="10-digit number" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                      <input className="input-field" type="password" name="password" onChange={handleProviderChange} required placeholder="Min 6 chars" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Service Charge (₹)</label>
                      <input className="input-field" type="number" name="serviceCharge" onChange={handleProviderChange} required placeholder="e.g. 200" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Hourly Rate (₹)</label>
                      <input className="input-field" type="number" name="hourlyRate" onChange={handleProviderChange} required placeholder="e.g. 500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Skills</label>
                    <div className="flex gap-2">
                      <input
                        className="input-field"
                        value={skillInput}
                        placeholder="e.g. Plumber"
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      />
                      <button type="button" className="btn-secondary px-4" onClick={addSkill}>Add</button>
                    </div>
                    {providerData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {providerData.skills.map((s) => (
                          <span key={s} onClick={() => removeSkill(s)} className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors">
                            {s} ✕
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="btn-primary w-full mt-4" type="submit" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Provider Account"}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-8 text-center text-sm font-medium text-slate-600">
            {mode === "login" ? (
              <p>Don't have an account? <button onClick={() => setMode("register")} className="text-indigo-600 hover:text-indigo-800 transition-colors ml-1">Register here</button></p>
            ) : (
              <p>Already have an account? <button onClick={() => setMode("login")} className="text-indigo-600 hover:text-indigo-800 transition-colors ml-1">Sign in</button></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;