import React from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Route, Routes } from 'react-router-dom';

import DummyPage from './pages/DummyPage/DummyPage';
import Login from './pages/login/login';
import Register from './pages/register/register'; 
import Dashboard from "./pages/dashboard/dashboard";
import Profile from "./pages/Profile/Profile";
import Bookings from "./pages/Bookings/Bookings";

const App = () => {
  return (
    <>
      <ToastContainer />
      <div className="app">
        <Routes>
          <Route path="/dummy" element={<DummyPage />} />
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bookings" element={<Bookings />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
