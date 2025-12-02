import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { initializeSocket } from "../../socket"; // ✅ Added import
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/providers/login`, {
        email,
        password,
      });

      const { token, provider } = response.data;

      if (!provider || provider.role !== "provider") {
        toast.error("Invalid user role. Please login as provider.");
        return;
      }

      toast.success("Login successful!");
      localStorage.setItem("token", token);
      localStorage.setItem("provider", JSON.stringify(provider));

      // ✅ Connect provider to socket room after login
      initializeSocket();

      // ✅ Navigate to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(
        error.response?.data?.message ||
          "Invalid credentials, please try again"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleLogin}>
        <h2>Provider Login</h2>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="register-link">
          Don’t have an account?{" "}
          <span onClick={() => navigate("/register")}>Register</span>
        </p>
      </form>
    </div>
  );
};

export default Login;
