// src/App.jsx
import React, { useEffect } from "react";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Routes, Route, Navigate } from "react-router-dom";

// Theme — single CSS for all pages
import "./theme/app_theme.css";

// Utils
import { isLoggedIn, getRole } from "./utils/auth";
import { connectSocket } from "./utils/socket";
import { getToken } from "./utils/auth";

// Pages
import AuthPage from "./pages/AuthPage";
import SeekerHomePage from "./pages/SeekerHomePage";
import BookingPage from "./pages/BookingPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

// Components
import ChatPopup from "./components/ChatPopup";
import Notification from "./components/Notification";

// ─── Protected Route ────────────────────────────────
// Checks login + role. Redirects if not authorized.
const ProtectedRoute = ({ children, role }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/auth" replace />;
  }
  if (role && getRole() !== role) {
    // Wrong role → send to their own home
    return getRole() === "seeker"
      ? <Navigate to="/seeker/home" replace />
      : <Navigate to="/provider/dashboard" replace />;
  }
  return children;
};

// ─── Root Redirect ───────────────────────────────────
// / → redirect to correct home based on role
const RootRedirect = () => {
  if (!isLoggedIn()) return <Navigate to="/auth" replace />;
  return getRole() === "provider"
    ? <Navigate to="/provider/dashboard" replace />
    : <Navigate to="/seeker/home" replace />;
};

// ─── App ─────────────────────────────────────────────
const App = () => {
  // Connect socket when app loads if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      const token = getToken();
      connectSocket(token);
    }
  }, []);

  const loggedIn = isLoggedIn();

  return (
    <div className="app">

      {/* Global toast container */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastStyle={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: "0.875rem",
          borderRadius: "10px",
        }}
      />

      {/* Notification listener — fires toasts on socket events */}
      {loggedIn && <Notification />}

      {/* Floating chat popup — mounted once, visible on all pages */}
      {loggedIn && <ChatPopup />}

      <Routes>

        {/* ── Public ───────────────────────────── */}
        <Route path="/auth" element={<AuthPage />} />

        {/* ── Root redirect ─────────────────────── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Seeker routes ─────────────────────── */}
        <Route
          path="/seeker/home"
          element={
            <ProtectedRoute role="seeker">
              <SeekerHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker/book/:providerId"
          element={
            <ProtectedRoute role="seeker">
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker/bookings"
          element={
            <ProtectedRoute role="seeker">
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* ── Provider routes ───────────────────── */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/profile"
          element={
            <ProtectedRoute role="provider">
              <ProviderProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ── 404 ───────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </div>
  );
};

export default App;