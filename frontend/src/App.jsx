// seeker/src/App.jsx
import React from "react";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Routes, Route, Navigate } from "react-router-dom";

import DummyPage from "./pages/DummyPage/DummyPage";
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import SeekerDashboard from "./pages/SeekerDashboard/SeekerDashboard";
import Booking from "./pages/Booking/Booking";
import MyBookings from "./pages/mybooking/mybooking";
import Profile from "./pages/Profile/Profile";
import ChatPage from "./components/Chat/ChatPage"; // ✅ Added import

const App = () => {
  const seeker = localStorage.getItem("seeker");
  const token = localStorage.getItem("token");

  const ProtectedRoute = ({ children }) => {
    if (!token || !seeker) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SeekerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/book/:providerId"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mybookings"
          element={
            <ProtectedRoute>
              <MyBookings />
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

        {/* ✅ Added Chat routes */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route path="/dummy" element={<DummyPage />} />
      </Routes>
    </>
  );
};

export default App;
