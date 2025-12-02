// provider/src/App.jsx
import React from "react";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Routes, Route, Navigate } from "react-router-dom";

import DummyPage from "./pages/DummyPage/DummyPage";
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import Dashboard from "./pages/dashboard/dashboard";
import Profile from "./pages/Profile/Profile";
import Bookings from "./pages/Bookings/Bookings";
import ChatPage from "./components/Chat/ChatPage";
import NotificationToast from "./components/Notifications/NotificationToast";

const App = () => {
  const provider = localStorage.getItem("provider");
  const token = localStorage.getItem("token");

  // 🔐 Protect routes
  const ProtectedRoute = ({ children }) => {
    if (!token || !provider) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <div className="app">
      {/* ✅ Global toast + real-time notification listener */}
      <ToastContainer position="top-right" autoClose={3000} />
      <NotificationToast />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dummy" element={<DummyPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />
        {/* 💬 Chat route */}
        <Route
          path="/chat/:chatId?"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
