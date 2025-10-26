import React from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Route, Routes } from 'react-router-dom';

import DummyPage from './pages/DummyPage/DummyPage';
import Login from './pages/login/login';
import Register from './pages/register/register'; // ✅ new import
import Dashboard from "./pages/dashboard/dashboard";

const App = () => {
  return (
    <>
      <ToastContainer />
      <div className="app">
        <Routes>
          <Route path="/dummy" element={<DummyPage />} />
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} /> {/* ✅ new route */}
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
