// src/App.jsx
import React, { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Routes, Route, Navigate } from "react-router-dom";

// Utils
import { isLoggedIn, getRole, getToken } from "./utils/auth";
import { connectSocket } from "./utils/socket";

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
const ProtectedRoute = ({ children, role }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/auth" replace />;
  }
  if (role && getRole() !== role) {
    return getRole() === "seeker"
      ? <Navigate to="/seeker/home" replace />
      : <Navigate to="/provider/dashboard" replace />;
  }
  return children;
};

// ─── Root Redirect ───────────────────────────────────
const RootRedirect = () => {
  if (!isLoggedIn()) return <Navigate to="/auth" replace />;
  return getRole() === "provider"
    ? <Navigate to="/provider/dashboard" replace />
    : <Navigate to="/seeker/home" replace />;
};

// ─── App ─────────────────────────────────────────────
const App = () => {
  useEffect(() => {
    if (isLoggedIn()) {
      const token = getToken();
      connectSocket(token);
    }
  }, []);

  const loggedIn = isLoggedIn();

  return (
    <div className="min-h-screen text-slate-800">
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        toastStyle={{
          borderRadius: "12px",
          fontFamily: "'Inter', sans-serif"
        }}
      />

      {loggedIn && <Notification />}
      {loggedIn && <ChatPopup />}

      <Routes>
        <Route path="/auth" element={<AuthPage />} />
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