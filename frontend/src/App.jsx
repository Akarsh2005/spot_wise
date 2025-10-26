import React from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Route, Routes } from 'react-router-dom';

import DummyPage from './pages/DummyPage/DummyPage';
import Login from './pages/login/login';
import Register from './pages/register/register';
import SeekerDashboard from './pages/SeekerDashboard/SeekerDashboard';
import Booking from './pages/Booking/Booking'; // <-- import Booking page
import MyBookings from './pages/mybooking/mybooking';
import Profile from "./pages/Profile/Profile";

const App = () => {
  return (
    <>
      <ToastContainer />
      <div className="app">
        <Routes>
          <Route path="/dummy" element={<DummyPage />} />
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<SeekerDashboard />} />
          <Route path="/book/:providerId" element={<Booking />} /> {/* <-- booking route */}
          <Route path="/mybookings" element={<MyBookings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
