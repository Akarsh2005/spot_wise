// pages/NotFoundPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn, getRole } from "../utils/auth";

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleHome = () => {
    if (!isLoggedIn()) return navigate("/auth");
    navigate(getRole() === "provider" ? "/provider/dashboard" : "/seeker/home");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", flexDirection: "column",
      textAlign: "center", padding: "20px",
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🗺️</div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
        Page Not Found
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "28px" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button className="btn-primary" onClick={handleHome}>
        Go to Home
      </button>
    </div>
  );
};

export default NotFoundPage;